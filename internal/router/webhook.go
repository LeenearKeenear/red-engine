package router

import (
	"encoding/json"
	"log"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/RED-Collective/red-engine/internal/fetch"
)

// githubWebhookPayload represents the minimal structure we need to extract the repository URL
type githubWebhookPayload struct {
	Repository struct {
		HTMLURL  string `json:"html_url"`
		CloneURL string `json:"clone_url"`
	} `json:"repository"`
}

// normalizeURL strips trailing slashes and .git extensions for robust matching
func normalizeURL(u string) string {
	u = strings.ToLower(strings.TrimSpace(u))
	u = strings.TrimSuffix(u, "/")
	u = strings.TrimSuffix(u, ".git")
	return u
}

func (h *handler) webhookSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Parse the incoming webhook payload
	var payload githubWebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		log.Printf("⚠️ Failed to decode webhook payload: %v", err)
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	incomingURL := payload.Repository.CloneURL
	if incomingURL == "" {
		incomingURL = payload.Repository.HTMLURL
	}

	if incomingURL == "" {
		log.Println("⚠️ Webhook received but no repository URL found in payload.")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Ignored: No repository URL"))
		return
	}

	normalizedIncoming := normalizeURL(incomingURL)
	log.Printf("🔄 Webhook received for repository: %s", normalizedIncoming)

	// We launch this in a goroutine so we can immediately return a 200 OK
	// to GitHub, preventing the webhook from timing out.
	go func() {
		successCount := 0

		// 2. Loop through tracked repositories, but ONLY trigger on a match
		for _, sync := range h.cfg.StartupSync {
			normalizedTarget := normalizeURL(sync.URL)

			// Skip if it doesn't match the webhook's origin repository
			if !strings.HasPrefix(normalizedTarget, normalizedIncoming) {
				continue
			}

			srcType := "raw"
			if strings.HasSuffix(strings.ToLower(sync.URL), ".git") {
				srcType = "git"
			} else if strings.HasSuffix(strings.ToLower(sync.URL), ".tar.gz") {
				srcType = "tar.gz"
			} else if strings.HasSuffix(strings.ToLower(sync.URL), ".zip") {
				srcType = "zip"
			}

			destDir := filepath.Join(h.store.DataDir(), filepath.Base(filepath.Clean(sync.Filename)))
			log.Printf("📥 Webhook matching target found. Triggering delta pull for: %s", sync.Filename)

			// Switch from Pull to PullDelta
			changedFiles, err := fetch.PullDelta(sync.URL, srcType, destDir)
			if err != nil {
				log.Printf("⚠️ Failed to sync %s: %v", sync.Filename, err)
			} else {
				successCount++
				// Apply Granular Memory Cache Invalidation
				if changedFiles == nil {
					log.Println("🔄 Fresh clone detected. Executing full memory index rebuild...")
					h.store.Reload()
				} else if len(changedFiles) > 0 {
					log.Printf("⚡ Hot-Patching %d modified files into active memory...", len(changedFiles))
					if err := h.store.UpdateFiles(changedFiles); err != nil {
						log.Printf("⚠️ Partial hot-reload failed, falling back to full reload: %v", err)
						h.store.Reload()
					}
				}
			}
		}

		if successCount > 0 {
			// 3. Hot-reload the memory map AFTER the files are successfully updated
			// (Note: We will optimize this full reload in Phase 3)
			if err := h.store.Reload(); err != nil {
				log.Printf("⚠️ Webhook sync completed, but memory index reload failed: %v", err)
			} else {
				log.Println("✅ Webhook sync complete. Memory index updated.")
			}
		} else {
			log.Println("⚠️ Webhook finished, but no matching tracked repositories were found for this URL.")
		}
	}()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Sync process initiated for matching targets"))
}
