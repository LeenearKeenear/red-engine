package router

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/RED-Collective/red-engine/internal/node"
	"github.com/RED-Collective/red-engine/internal/registry"
)

func (h *handler) nodeInfo(w http.ResponseWriter, r *http.Request) {
	exportedPaths := []string{}
	entries, err := os.ReadDir(h.store.DataDir())
	if err == nil {
		for _, entry := range entries {
			if entry.IsDir() {
				exportedPaths = append(exportedPaths, "/"+entry.Name())
			}
		}
	}

	version := "v1.2.0"

	info := node.GetNodeInfo(h.nodeName(), version, exportedPaths)
	// Self-reported networking metadata, sourced from node_settings.
	info.PublicURL = registry.GetSetting("public_url")
	info.TunnelType = registry.GetSetting("tunnel_type")
	info.Description = registry.GetSetting("node_description")

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(info); err != nil {
		http.Error(w, "Failed to encode node info", http.StatusInternalServerError)
	}
}
