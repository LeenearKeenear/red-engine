package navigation

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ScanDataDirectories walks every top-level vault under dataDir and rebuilds the
// navigation index inside a single transaction.
func (s *Service) ScanDataDirectories() (*ScanResult, error) {
	start := time.Now()
	result := &ScanResult{StartTime: start.Format(time.RFC3339)}

	entries, err := os.ReadDir(s.dataDir)
	if err != nil {
		return nil, fmt.Errorf("read data dir %s: %w", s.dataDir, err)
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("begin scan tx: %w", err)
	}
	defer tx.Rollback()

	for _, e := range entries {
		name := e.Name()
		if !e.IsDir() || strings.HasPrefix(name, ".") {
			continue
		}
		absPath := filepath.Join(s.dataDir, name)
		folders, guides, errs := s.scanDir(tx, absPath, name, name, nil)
		result.FoldersScanned += folders
		result.GuidesIndexed += guides
		result.Errors = append(result.Errors, errs...)
	}

	if err := s.updateAggregates(tx); err != nil {
		return nil, fmt.Errorf("update aggregates: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit scan tx: %w", err)
	}

	end := time.Now()
	result.EndTime = end.Format(time.RFC3339)
	result.Duration = end.Sub(start).String()
	return result, nil
}

// scanDir indexes a single folder and recurses into its subdirectories.
// relPath is the path stored in the database (relative to dataDir, slash-separated).
// contentType is the top-level vault name and is propagated to every descendant.
func (s *Service) scanDir(dbtx DBTX, absPath, relPath, contentType string, parentID *int64) (int, int, []string) {
	var folders, guides int
	var errs []string

	relPath = filepath.ToSlash(relPath)

	entries, err := os.ReadDir(absPath)
	if err != nil {
		return 0, 0, []string{fmt.Sprintf("read %s: %v", relPath, err)}
	}

	var mdFiles []os.DirEntry
	var subDirs []os.DirEntry
	for _, e := range entries {
		name := e.Name()
		if strings.HasPrefix(name, ".") {
			continue
		}
		if e.IsDir() {
			subDirs = append(subDirs, e)
		} else if strings.EqualFold(filepath.Ext(name), ".md") {
			mdFiles = append(mdFiles, e)
		}
	}

	// A folder is a leaf when it holds markdown files and no further subfolders.
	isLeaf := len(mdFiles) > 0 && len(subDirs) == 0

	// Derive a description from index.md if present.
	description := ""
	for _, f := range mdFiles {
		if strings.EqualFold(f.Name(), "index.md") {
			if content, err := os.ReadFile(filepath.Join(absPath, f.Name())); err == nil {
				description = ExtractFirstParagraph(string(content))
			}
			break
		}
	}

	displayName := HumanizeFolder(filepath.Base(relPath))
	folderID, err := s.upsertFolder(dbtx, relPath, displayName, description, contentType, parentID, isLeaf)
	if err != nil {
		return 0, 0, []string{err.Error()}
	}

	folders++

	for _, f := range mdFiles {
		fileAbs := filepath.Join(absPath, f.Name())
		fileRel := relPath + "/" + f.Name()
		content, err := os.ReadFile(fileAbs)
		if err != nil {
			errs = append(errs, fmt.Sprintf("read %s: %v", fileRel, err))
			continue
		}
		title := ExtractFirstHeading(string(content))
		if title == "" {
			title = HumanizeFolder(strings.TrimSuffix(f.Name(), filepath.Ext(f.Name())))
		}
		preview := ExtractFirstParagraph(string(content))
		wordCount := CountWords(string(content))

		var modTime time.Time
		if info, err := f.Info(); err == nil {
			modTime = info.ModTime()
		}

		if err := s.upsertGuide(dbtx, folderID, f.Name(), fileRel, title, preview, wordCount, modTime); err != nil {
			errs = append(errs, fmt.Sprintf("index %s: %v", fileRel, err))
			continue
		}
		guides++
	}

	for _, d := range subDirs {
		childAbs := filepath.Join(absPath, d.Name())
		childRel := relPath + "/" + d.Name()
		fID := folderID
		f, g, e := s.scanDir(dbtx, childAbs, childRel, contentType, &fID)
		folders += f
		guides += g
		errs = append(errs, e...)
	}

	return folders, guides, errs
}

// VerifyNavigationDB reports navigation folders whose parent_id points at a
// non-existent folder.
func (s *Service) VerifyNavigationDB() error {
	var orphans int
	err := s.db.QueryRow(`
		SELECT COUNT(*) FROM nav_folders
		WHERE parent_id IS NOT NULL
		  AND parent_id NOT IN (SELECT id FROM nav_folders)`).Scan(&orphans)
	if err != nil {
		return fmt.Errorf("verify nav db: %w", err)
	}
	if orphans > 0 {
		return fmt.Errorf("found %d orphaned folder reference(s)", orphans)
	}
	return nil
}
