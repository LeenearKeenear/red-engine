package navigation

import (
	"os"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// buildTree lays out a temporary data dir:
//
//	physics/            (branch — has a subdir)
//	  index.md
//	  mechanics/        (leaf — only .md files)
//	    intro.md
//	    .hidden.md      (skipped: dotfile)
//	  .obsidian/        (skipped: dot-dir)
//	    config.json
//	.private/           (skipped: top-level dot-dir)
//	  secret.md
func buildTree(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	mk := func(rel, body string) {
		p := filepath.Join(root, rel)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	mk("physics/index.md", "# Physics\n\nThe study of matter and energy.")
	mk("physics/mechanics/intro.md", "# Intro to Mechanics\n\nNewton's laws and motion.")
	mk("physics/mechanics/.hidden.md", "should be ignored")
	mk("physics/.obsidian/config.json", "{}")
	mk(".private/secret.md", "top-level dot dir, ignored")
	return root
}

func TestScanDataDirectories(t *testing.T) {
	db := newTestDB(t)
	s := NewService(db, buildTree(t))

	res, err := s.ScanDataDirectories()
	if err != nil {
		t.Fatalf("scan: %v", err)
	}
	if len(res.Errors) != 0 {
		t.Errorf("unexpected scan errors: %v", res.Errors)
	}
	// physics + physics/mechanics = 2 folders; .private and .obsidian skipped.
	if res.FoldersScanned != 2 {
		t.Errorf("FoldersScanned = %d, want 2", res.FoldersScanned)
	}
	// index.md + intro.md = 2 guides; .hidden.md skipped.
	if res.GuidesIndexed != 2 {
		t.Errorf("GuidesIndexed = %d, want 2", res.GuidesIndexed)
	}

	if err := s.VerifyNavigationDB(); err != nil {
		t.Errorf("verify: %v", err)
	}
}

func TestScanLeafAndBranchFlags(t *testing.T) {
	db := newTestDB(t)
	s := NewService(db, buildTree(t))
	if _, err := s.ScanDataDirectories(); err != nil {
		t.Fatalf("scan: %v", err)
	}

	// physics has a subdir → branch; description pulled from index.md.
	branch, err := s.GetNavigationTree("physics")
	if err != nil {
		t.Fatalf("tree physics: %v", err)
	}
	if branch.IsLeaf {
		t.Error("physics should be a branch, not a leaf")
	}
	if branch.ContentType != "physics" {
		t.Errorf("content_type = %q, want physics", branch.ContentType)
	}
	if branch.Description != "The study of matter and energy." {
		t.Errorf("description = %q", branch.Description)
	}
	if branch.ChildCount != 1 {
		t.Errorf("child_count = %d, want 1", branch.ChildCount)
	}
	if len(branch.Children) != 1 || branch.Children[0].Path != "physics/mechanics" {
		t.Fatalf("unexpected children: %+v", branch.Children)
	}

	// physics/mechanics has only .md files → leaf with one guide.
	leaf := branch.Children[0]
	if !leaf.IsLeaf {
		t.Error("physics/mechanics should be a leaf")
	}
	if leaf.GuideCount != 1 {
		t.Errorf("guide_count = %d, want 1", leaf.GuideCount)
	}
	if leaf.ContentType != "physics" {
		t.Errorf("leaf content_type = %q, want physics (inherited)", leaf.ContentType)
	}
}

func TestScanIsIdempotent(t *testing.T) {
	db := newTestDB(t)
	s := NewService(db, buildTree(t))
	if _, err := s.ScanDataDirectories(); err != nil {
		t.Fatalf("first scan: %v", err)
	}
	if _, err := s.ScanDataDirectories(); err != nil {
		t.Fatalf("second scan: %v", err)
	}
	var folderCount, guideCount int
	db.QueryRow(`SELECT COUNT(*) FROM nav_folders`).Scan(&folderCount)
	db.QueryRow(`SELECT COUNT(*) FROM nav_guides`).Scan(&guideCount)
	if folderCount != 2 {
		t.Errorf("after rescan nav_folders = %d, want 2 (no duplicates)", folderCount)
	}
	if guideCount != 2 {
		t.Errorf("after rescan nav_guides = %d, want 2 (no duplicates)", guideCount)
	}
}

func TestScanMissingDataDir(t *testing.T) {
	db := newTestDB(t)
	s := NewService(db, filepath.Join(t.TempDir(), "does-not-exist"))
	if _, err := s.ScanDataDirectories(); err == nil {
		t.Error("expected error scanning a missing data dir")
	}
}
