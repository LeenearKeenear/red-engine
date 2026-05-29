package fetch

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
)

// pullGit now returns a slice of exact file paths that were modified during the sync.
func pullGit(url, destDir string) ([]string, error) {
	repo, err := git.PlainOpen(destDir)
	if err != nil {
		if err == git.ErrRepositoryNotExists {
			log.Printf("📥 Native go-git: Cloning fresh repository into %s...", destDir)
			if err := os.MkdirAll(destDir, 0755); err != nil {
				return nil, err
			}
			_, err = git.PlainClone(destDir, false, &git.CloneOptions{
				URL:      url,
				Progress: os.Stdout,
			})
			if err != nil {
				return nil, fmt.Errorf("go-git clone failed: %v", err)
			}
			// Returning a nil slice tells the router "Everything is new, do a full reload"
			return nil, nil
		}
		return nil, fmt.Errorf("failed to check existing repository: %v", err)
	}

	log.Printf("🔄 Native go-git: Checking for delta updates at %s...", destDir)
	worktree, err := repo.Worktree()
	if err != nil {
		return nil, fmt.Errorf("failed to get git worktree: %v", err)
	}

	// 1. Capture the commit hash BEFORE the pull
	var oldHash plumbing.Hash
	if head, err := repo.Head(); err == nil {
		oldHash = head.Hash()
	}

	err = worktree.Pull(&git.PullOptions{
		RemoteName: "origin",
		Force:      true,
		Progress:   os.Stdout,
	})

	if err != nil {
		if err == git.NoErrAlreadyUpToDate {
			log.Printf("✅ Sync skipped: %s is already up to date.", destDir)
			return []string{}, nil // Empty slice means 0 files changed
		}
		return nil, fmt.Errorf("go-git delta pull failed: %v", err)
	}

	var changedFiles []string

	// 2. Capture the commit hash AFTER the pull and calculate the diff
	if head, err := repo.Head(); err == nil {
		newHash := head.Hash()
		if oldHash != plumbing.ZeroHash && oldHash != newHash {
			oldCommit, err1 := repo.CommitObject(oldHash)
			newCommit, err2 := repo.CommitObject(newHash)
			if err1 == nil && err2 == nil {
				patch, err3 := oldCommit.Patch(newCommit)
				if err3 == nil {
					for _, fileStat := range patch.Stats() {
						// go-git returns relative paths (e.g., "docs/guide.md"). Convert to absolute.
						fullPath := filepath.Join(destDir, fileStat.Name)
						changedFiles = append(changedFiles, fullPath)
					}
				}
			}
		}
	}

	log.Printf("✅ Native go-git: Applied delta updates to %s (%d files changed)", destDir, len(changedFiles))
	return changedFiles, nil
}
