package router

import (
	"encoding/json"
	"net/http"
)

func (h *handler) health(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func (h *handler) manifest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"name": "RED Engine", "short_name": "RED", "start_url": "/", "display": "standalone"}`))
}

func (h *handler) searchIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// FIX: Explicitly forbid browsers and proxies from caching this JSON file
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	index := h.store.BuildSearchIndex()

	// Safety net: ensure it returns an empty array [] instead of a 'null' object if the DB is empty
	if index == nil {
		w.Write([]byte("[]"))
		return
	}

	if err := json.NewEncoder(w).Encode(index); err != nil {
		http.Error(w, "Failed to generate search index", http.StatusInternalServerError)
	}
}
