package store

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"html/template"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/RED-Collective/red-engine/internal/models"
	"github.com/RED-Collective/red-engine/internal/render"
	"github.com/radovskyb/watcher"
	// <--- ADD THIS
)

type Store struct {
	dataDir string
	nav     map[string]*models.Section
	mu      sync.RWMutex
}

func New(dataDir string) *Store {
	return &Store{
		dataDir: dataDir,
		nav:     make(map[string]*models.Section),
	}
}

func (s *Store) DataDir() string {
	return s.dataDir
}

func parseManifestJSON(data []byte) map[string]models.ManifestEntry {
	result := make(map[string]models.ManifestEntry)
	var wrapped models.Manifest
	if err := json.Unmarshal(data, &wrapped); err == nil && len(wrapped.Files) > 0 {
		return wrapped.Files
	}
	if err := json.Unmarshal(data, &result); err == nil {
		return result
	}
	return result
}

func (s *Store) Watch() error {
	w := watcher.New()

	// Set watcher to poll every 2 seconds. This easily crosses the container boundary
	// without relying on OS-level inotify events.
	w.SetMaxEvents(1)
	w.FilterOps(watcher.Write, watcher.Create, watcher.Remove, watcher.Rename)

	go func() {
		for {
			select {
			case event := <-w.Event:
				log.Printf("🔄 Local file change detected: %s", event.Path)

				// Hook into our new Granular Hot-Reloading module!
				// We pass just the single file that was edited locally.
				if err := s.UpdateFiles([]string{event.Path}); err != nil {
					log.Printf("⚠️ Hot-reload failed for %s, falling back to full reload", event.Path)
					s.Reload()
				}
			case err := <-w.Error:
				log.Println("⚠️ Watcher error:", err)
			case <-w.Closed:
				return
			}
		}
	}()

	absDataDir, _ := filepath.Abs(s.dataDir)

	// AddRecursive automatically walks subdirectories, simplifying setup
	if err := w.AddRecursive(absDataDir); err != nil {
		return err
	}

	log.Printf("[DEBUG] File watcher interval polling started on %s", absDataDir)

	// Start the polling cycle in the background
	go func() {
		if err := w.Start(2 * time.Second); err != nil {
			log.Fatalln(err)
		}
	}()

	return nil
}

func (s *Store) Reload() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	trustedKeys := make(map[string]string)
	if trustData, err := os.ReadFile("contributors.json"); err == nil {
		var contributors []models.Contributor
		if err := json.Unmarshal(trustData, &contributors); err == nil {
			for _, c := range contributors {
				trustedKeys[strings.ToLower(c.PublicKey)] = c.Name
			}
		}
	} else {
		log.Println("⚠️  Warning: contributors.json not found. Verification checks disabled.")
	}

	allSignatures := make(map[string]models.ManifestEntry)
	filepath.WalkDir(s.dataDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || filepath.Base(path) != "manifest.json" {
			return nil
		}
		manifestData, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		manifest := parseManifestJSON(manifestData)
		if len(manifest) == 0 {
			return nil
		}
		manifestDir := filepath.Dir(path)
		relManifestDir, err := filepath.Rel(s.dataDir, manifestDir)
		if err != nil {
			relManifestDir = "."
		}
		relManifestDir = filepath.ToSlash(relManifestDir)

		for key, entry := range manifest {
			key = filepath.ToSlash(key)
			var fullKey string
			if relManifestDir == "." {
				fullKey = key
			} else if strings.HasPrefix(key, relManifestDir+"/") || key == relManifestDir {
				fullKey = key
			} else {
				fullKey = filepath.ToSlash(filepath.Join(relManifestDir, key))
			}
			allSignatures[fullKey] = entry
		}
		return nil
	})

	newNav := make(map[string]*models.Section)

	err := filepath.WalkDir(s.dataDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || filepath.Ext(path) != ".md" {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}

		hashBytes := sha256.Sum256(content)
		fileHash := hex.EncodeToString(hashBytes[:])

		res, err := render.Markdown(string(content))
		if err != nil {
			return nil
		}

		rel, _ := filepath.Rel(s.dataDir, path)
		relativePath := strings.TrimPrefix(filepath.ToSlash(rel), "/")

		cleanPath := strings.TrimSuffix(relativePath, ".md")

		isVerified := false
		authorName := "Unverified / Unknown Origin"
		verifyErr := "File signature not found in manifest"

		if entry, exists := allSignatures[relativePath]; exists {
			entryHash := entry.FileHash
			if entryHash == "" {
				entryHash = entry.Hash
			}

			if entryHash == fileHash {
				if trustedAuthor, isTrusted := trustedKeys[strings.ToLower(entry.PublicKey)]; isTrusted {
					pubBytes, err1 := hex.DecodeString(entry.PublicKey)
					sigBytes, err2 := hex.DecodeString(entry.Signature)

					if err1 == nil && err2 == nil && len(pubBytes) == ed25519.PublicKeySize {
						if ed25519.Verify(pubBytes, content, sigBytes) ||
							ed25519.Verify(pubBytes, []byte(fileHash), sigBytes) ||
							ed25519.Verify(pubBytes, hashBytes[:], sigBytes) {
							isVerified = true
							authorName = trustedAuthor
							verifyErr = ""
						} else {
							verifyErr = "Invalid Signature: Cryptographic verification failed"
						}
					} else {
						verifyErr = "Malformed Signature or Public Key data"
					}
				} else {
					verifyErr = "Untrusted Key: The public key is not mapped in contributors.json"
				}
			} else {
				verifyErr = "Hash Mismatch: File content was modified after signing"
			}
		}

		parts := strings.Split(filepath.ToSlash(cleanPath), "/")

		title := parts[len(parts)-1]
		title = strings.ReplaceAll(title, "-", " ")
		title = strings.Title(title)

		art := &models.Article{
			Path:              "/" + filepath.ToSlash(cleanPath),
			Title:             title,
			Body:              template.HTML(res.HTMLContent),
			Hash:              fileHash,
			Verified:          isVerified,
			Author:            authorName,
			VerificationError: verifyErr,
		}

		if len(parts) == 1 {
			if newNav["root"] == nil {
				newNav["root"] = &models.Section{Name: "root"}
			}
			newNav["root"].Articles = append(newNav["root"].Articles, art)
		} else {
			secName := parts[0]
			if newNav[secName] == nil {
				newNav[secName] = &models.Section{Name: secName, Sub: make(map[string]*models.Section)}
			}
			sec := newNav[secName]
			if len(parts) == 2 {
				sec.Articles = append(sec.Articles, art)
			} else {
				subName := parts[1]
				if sec.Sub[subName] == nil {
					sec.Sub[subName] = &models.Section{Name: subName}
				}
				sec.Sub[subName].Articles = append(sec.Sub[subName].Articles, art)
			}
		}
		return nil
	})

	if err != nil {
		return err
	}

	s.nav = newNav
	return nil
}

func (s *Store) Nav() map[string]*models.Section {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.nav
}

func (s *Store) Get(path string) *models.Article {
	s.mu.RLock()
	defer s.mu.RUnlock()

	path = strings.TrimPrefix(path, "/")
	parts := strings.Split(path, "/")

	if len(parts) == 1 {
		if sec, ok := s.nav["root"]; ok {
			for _, a := range sec.Articles {
				if a.Path == "/"+path {
					return a
				}
			}
		}
	} else if len(parts) == 2 {
		if sec, ok := s.nav[parts[0]]; ok {
			for _, a := range sec.Articles {
				if a.Path == "/"+path {
					return a
				}
			}
		}
	} else if len(parts) == 3 {
		if sec, ok := s.nav[parts[0]]; ok {
			if sub, ok := sec.Sub[parts[1]]; ok {
				for _, a := range sub.Articles {
					if a.Path == "/"+path {
						return a
					}
				}
			}
		}
	}
	return nil
}

func (s *Store) Root() map[string]*models.Section {
	s.mu.RLock()
	defer s.mu.RUnlock()

	copy := make(map[string]*models.Section, len(s.nav))
	for k, v := range s.nav {
		copy[k] = v
	}
	return copy
}

// =====================================================================
// GRANULAR HOT-RELOADING MODULE
// =====================================================================

// UpdateFiles surgically patches the navigation tree by removing and re-rendering
// only the specific files that were modified by a remote Git commit.
func (s *Store) UpdateFiles(changedPaths []string) error {
	for _, p := range changedPaths {
		if strings.HasSuffix(p, "manifest.json") || strings.HasSuffix(p, "contributors.json") {
			log.Println("🛡️ Security definitions modified. Forcing full engine reload...")
			return s.Reload()
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// 2. Quickly load trust data into memory so we can verify the patched files
	trustedKeys := make(map[string]string)
	if trustData, err := os.ReadFile("contributors.json"); err == nil {
		var contributors []models.Contributor
		if err := json.Unmarshal(trustData, &contributors); err == nil {
			for _, c := range contributors {
				trustedKeys[strings.ToLower(c.PublicKey)] = c.Name
			}
		}
	}

	allSignatures := make(map[string]models.ManifestEntry)
	filepath.WalkDir(s.dataDir, func(path string, d fs.DirEntry, err error) error {
		if err == nil && !d.IsDir() && filepath.Base(path) == "manifest.json" {
			if manifestData, err := os.ReadFile(path); err == nil {
				manifest := parseManifestJSON(manifestData)
				relManifestDir, _ := filepath.Rel(s.dataDir, filepath.Dir(path))
				relManifestDir = filepath.ToSlash(relManifestDir)
				for key, entry := range manifest {
					fullKey := filepath.ToSlash(key)
					if relManifestDir != "." && !strings.HasPrefix(fullKey, relManifestDir+"/") && fullKey != relManifestDir {
						fullKey = filepath.ToSlash(filepath.Join(relManifestDir, fullKey))
					}
					allSignatures[fullKey] = entry
				}
			}
		}
		return nil
	})

	// 3. Apply the Patches
	for _, p := range changedPaths {
		p = filepath.Clean(p)
		if filepath.Ext(p) != ".md" {
			continue
		}

		rel, err := filepath.Rel(s.dataDir, p)
		if err != nil {
			continue
		}

		relativePath := strings.TrimPrefix(filepath.ToSlash(rel), "/")
		cleanPath := strings.TrimSuffix(relativePath, ".md")
		parts := strings.Split(filepath.ToSlash(cleanPath), "/")

		// Step A: Surgically remove the old article from the tree if it existed
		s.removeArticle(parts)

		// Step B: Attempt to read the new content. If it fails, the file was deleted via Git.
		// Since we just removed it from the tree above, we are already done!
		content, err := os.ReadFile(p)
		if err != nil {
			continue
		}

		// Step C: Render & Verify the updated content
		hashBytes := sha256.Sum256(content)
		fileHash := hex.EncodeToString(hashBytes[:])
		res, err := render.Markdown(string(content))
		if err != nil {
			continue
		}

		isVerified := false
		authorName := "Unverified / Unknown Origin"
		verifyErr := "File signature not found in manifest"

		if entry, exists := allSignatures[relativePath]; exists {
			entryHash := entry.FileHash
			if entryHash == "" {
				entryHash = entry.Hash
			}
			if entryHash == fileHash {
				if trustedAuthor, isTrusted := trustedKeys[strings.ToLower(entry.PublicKey)]; isTrusted {
					pubBytes, err1 := hex.DecodeString(entry.PublicKey)
					sigBytes, err2 := hex.DecodeString(entry.Signature)
					if err1 == nil && err2 == nil && len(pubBytes) == ed25519.PublicKeySize {
						if ed25519.Verify(pubBytes, content, sigBytes) || ed25519.Verify(pubBytes, []byte(fileHash), sigBytes) || ed25519.Verify(pubBytes, hashBytes[:], sigBytes) {
							isVerified = true
							authorName = trustedAuthor
							verifyErr = ""
						} else {
							verifyErr = "Invalid Signature: Cryptographic verification failed"
						}
					} else {
						verifyErr = "Malformed Signature or Public Key data"
					}
				} else {
					verifyErr = "Untrusted Key: The public key is not mapped in contributors.json"
				}
			} else {
				verifyErr = "Hash Mismatch: File content was modified after signing"
			}
		}

		title := parts[len(parts)-1]
		title = strings.ReplaceAll(title, "-", " ")
		title = strings.Title(title)

		art := &models.Article{
			Path:              "/" + filepath.ToSlash(cleanPath),
			Title:             title,
			Body:              template.HTML(res.HTMLContent),
			Hash:              fileHash,
			Verified:          isVerified,
			Author:            authorName,
			VerificationError: verifyErr,
		}

		// Step D: Insert the fresh article back into the tree
		s.insertArticle(parts, art)
	}

	return nil
}

// removeArticle safely deletes an article from the nested navigation map
func (s *Store) removeArticle(parts []string) {
	if len(parts) == 1 {
		if sec, ok := s.nav["root"]; ok {
			for i, a := range sec.Articles {
				if a.Path == "/"+parts[0] {
					sec.Articles = append(sec.Articles[:i], sec.Articles[i+1:]...)
					break
				}
			}
		}
	} else if len(parts) == 2 {
		if sec, ok := s.nav[parts[0]]; ok {
			for i, a := range sec.Articles {
				if a.Path == "/"+parts[0]+"/"+parts[1] {
					sec.Articles = append(sec.Articles[:i], sec.Articles[i+1:]...)
					break
				}
			}
		}
	} else if len(parts) == 3 {
		if sec, ok := s.nav[parts[0]]; ok {
			if sub, ok := sec.Sub[parts[1]]; ok {
				for i, a := range sub.Articles {
					if a.Path == "/"+parts[0]+"/"+parts[1]+"/"+parts[2] {
						sub.Articles = append(sub.Articles[:i], sub.Articles[i+1:]...)
						break
					}
				}
			}
		}
	}
}

// insertArticle cleanly adds an article to the nested navigation map
func (s *Store) insertArticle(parts []string, art *models.Article) {
	if len(parts) == 1 {
		if s.nav["root"] == nil {
			s.nav["root"] = &models.Section{Name: "root"}
		}
		s.nav["root"].Articles = append(s.nav["root"].Articles, art)
	} else {
		secName := parts[0]
		if s.nav[secName] == nil {
			s.nav[secName] = &models.Section{Name: secName, Sub: make(map[string]*models.Section)}
		}
		sec := s.nav[secName]
		if len(parts) == 2 {
			sec.Articles = append(sec.Articles, art)
		} else {
			subName := parts[1]
			if sec.Sub[subName] == nil {
				sec.Sub[subName] = &models.Section{Name: subName}
			}
			sec.Sub[subName].Articles = append(sec.Sub[subName].Articles, art)
		}
	}
}
