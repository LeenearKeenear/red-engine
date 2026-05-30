package router

import (
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/RED-Collective/red-engine/internal/config"
	"github.com/RED-Collective/red-engine/internal/fetch"
)

func (h *handler) importRemote(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// ---- Decode request first ----
	var req struct {
		URL           string `json:"url"`
		Filename      string `json:"filename"`
		SaveToStartup bool   `json:"saveToStartup"`
		PeerURL       string `json:"peer_url"`
		RemotePath    string `json:"remote_path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// ---- Peer‑based sync ----
	if req.PeerURL != "" && req.RemotePath != "" {
		destDir := filepath.Join(h.store.DataDir(), req.Filename)
		if err := h.pullFromPeer(req.PeerURL, req.RemotePath, destDir); err != nil {
			http.Error(w, "Peer sync failed: "+err.Error(), http.StatusBadGateway)
			return
		}
		if err := h.store.Reload(); err != nil {
			http.Error(w, "Reload after peer sync failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		if req.SaveToStartup {
			h.cfg.Mu.Lock()
			h.cfg.StartupSync = append(h.cfg.StartupSync, config.RemoteSync{
				URL:      req.PeerURL + req.RemotePath,
				Filename: req.Filename,
			})
			h.cfg.Mu.Unlock()
			if err := h.cfg.Save(h.cfgPath); err != nil {
				http.Error(w, "Saved content but failed to update config: "+err.Error(), http.StatusInternalServerError)
				return
			}
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Peer sync completed to " + destDir))
		return
	}

	// ---- Normal URL‑based import (unchanged) ----
	if req.URL == "" {
		http.Error(w, "URL required", http.StatusBadRequest)
		return
	}

	// 1. SSRF Protection & URL Parsing
	parsedURL, err := url.Parse(req.URL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		http.Error(w, "Invalid URL scheme", http.StatusBadRequest)
		return
	}
	hostname := parsedURL.Hostname()
	addrs, err := net.LookupHost(hostname)
	if err != nil {
		http.Error(w, "Failed to resolve hostname", http.StatusBadRequest)
		return
	}
	for _, addr := range addrs {
		ip := net.ParseIP(addr)
		if ip == nil || ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
			http.Error(w, "Local network imports are strictly forbidden", http.StatusForbidden)
			return
		}
	}

	// --- SMART GITHUB URL REWRITER ---
	if parsedURL.Host == "github.com" {
		pathParts := strings.Split(strings.Trim(parsedURL.Path, "/"), "/")
		if len(pathParts) == 2 {
			repoName := strings.TrimSuffix(pathParts[1], ".git")
			req.URL = "https://github.com/" + pathParts[0] + "/" + repoName + ".git"
			parsedURL, _ = url.Parse(req.URL)
		} else if len(pathParts) > 2 && pathParts[2] == "blob" {
			req.URL = "https://raw.githubusercontent.com/" + pathParts[0] + "/" + pathParts[1] + "/" + strings.Join(pathParts[3:], "/")
			parsedURL, _ = url.Parse(req.URL)
		}
	}

	// 2. Directory & Path Sanitization & Auto-Naming
	targetSubPath := filepath.Clean(req.Filename)
	if targetSubPath == "." || targetSubPath == "" {
		pathParts := strings.Split(strings.TrimRight(parsedURL.Path, "/"), "/")
		if len(pathParts) > 0 {
			if parsedURL.Host == "github.com" && len(pathParts) >= 3 && pathParts[3] == "archive" {
				targetSubPath = pathParts[2]
			} else {
				lastPart := pathParts[len(pathParts)-1]
				lastPart = strings.TrimSuffix(lastPart, ".zip")
				lastPart = strings.TrimSuffix(lastPart, ".tar.gz")
				lastPart = strings.TrimSuffix(lastPart, ".tgz")
				lastPart = strings.TrimSuffix(lastPart, ".md")
				lastPart = strings.TrimSuffix(lastPart, ".git")
				if lastPart != "" {
					targetSubPath = lastPart
				}
			}
		}
	}
	if targetSubPath == "." || targetSubPath == "" || strings.HasPrefix(targetSubPath, "..") || filepath.IsAbs(targetSubPath) {
		targetSubPath = "sync-" + time.Now().Format("20060102150405")
	}

	destinationDir := filepath.Join(h.store.DataDir(), targetSubPath)
	lowerURL := strings.ToLower(req.URL)

	srcType := "raw"
	if strings.HasSuffix(lowerURL, ".git") {
		srcType = "git"
	} else if strings.HasSuffix(lowerURL, ".tar.gz") {
		srcType = "tar.gz"
	} else if strings.HasSuffix(lowerURL, ".zip") {
		srcType = "zip"
	}

	if srcType == "git" || srcType == "tar.gz" || srcType == "zip" {
		if err := fetch.Pull(req.URL, srcType, destinationDir); err != nil {
			http.Error(w, "Failed to pull remote repository: "+err.Error(), http.StatusBadGateway)
			return
		}
	} else {
		// raw file
		if err := os.MkdirAll(filepath.Dir(destinationDir), 0755); err != nil {
			http.Error(w, "Failed to create directory structure", http.StatusInternalServerError)
			return
		}
		if !strings.HasSuffix(strings.ToLower(destinationDir), ".md") {
			destinationDir += ".md"
			targetSubPath += ".md"
		}
		httpReq, err := http.NewRequest(http.MethodGet, req.URL, nil)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		httpReq.Header.Set("User-Agent", "RED-Engine-Sync/1.0")
		client := &http.Client{Timeout: 15 * time.Second}
		resp, err := client.Do(httpReq)
		if err != nil {
			http.Error(w, "Failed to connect to remote server", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			http.Error(w, "Remote server returned non-OK status", http.StatusBadGateway)
			return
		}
		outFile, err := os.Create(destinationDir)
		if err != nil {
			http.Error(w, "Failed to create file on disk", http.StatusInternalServerError)
			return
		}
		defer outFile.Close()
		if _, err := io.Copy(outFile, resp.Body); err != nil {
			http.Error(w, "Failed to write content", http.StatusInternalServerError)
			return
		}
	}

	if err := h.store.Reload(); err != nil {
		http.Error(w, "Content updated but failed to update memory index", http.StatusInternalServerError)
		return
	}

	if req.SaveToStartup {
		h.cfg.Mu.Lock()
		var newSync []config.RemoteSync
		for _, sync := range h.cfg.StartupSync {
			if sync.Filename != targetSubPath {
				newSync = append(newSync, sync)
			}
		}
		newSync = append(newSync, config.RemoteSync{
			URL:      req.URL,
			Filename: targetSubPath,
		})
		h.cfg.StartupSync = newSync
		h.cfg.Mu.Unlock()
		if err := h.cfg.Save(h.cfgPath); err != nil {
			http.Error(w, "Synced successfully, but config save failed", http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Successfully synced to data/" + targetSubPath))
}

// ... other existing functions (adminConfig, adminRemove) remain unchanged ...
// --- SECURE DASHBOARD ENDPOINTS ---

func (h *handler) adminConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	h.cfg.Mu.RLock()
	defer h.cfg.Mu.RUnlock()
	json.NewEncoder(w).Encode(h.cfg.StartupSync)
}

func (h *handler) adminRemove(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Filename         string `json:"filename"`
		DeleteLocalFiles bool   `json:"deleteLocalFiles"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// 1. Remove from the Config Array
	h.cfg.Mu.Lock()
	var newSync []config.RemoteSync
	for _, sync := range h.cfg.StartupSync {
		if sync.Filename != req.Filename {
			newSync = append(newSync, sync)
		}
	}
	h.cfg.StartupSync = newSync
	h.cfg.Mu.Unlock()

	// 2. Save Config to Disk
	if err := h.cfg.Save(h.cfgPath); err != nil {
		http.Error(w, "Failed to save configuration", http.StatusInternalServerError)
		return
	}

	// 3. CONDITIONALLY Delete the physical target directory or file safely
	if req.DeleteLocalFiles {
		safeName := filepath.Clean(req.Filename)
		if safeName != "." && safeName != "" && !strings.HasPrefix(safeName, "..") && !filepath.IsAbs(safeName) {
			fullRemovalPath := filepath.Join(h.store.DataDir(), safeName)
			os.RemoveAll(fullRemovalPath) // Cleans folders and files instantly
		}
	}

	// 4. Hot-reload the engine so it updates the UI mapping
	h.store.Reload()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Successfully untracked " + req.Filename))
}
