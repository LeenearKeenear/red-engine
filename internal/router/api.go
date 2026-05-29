package router

import (
	"net/http"
)

func (h *handler) health(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func (h *handler) manifest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// Basic PWA manifest response
	w.Write([]byte(`{"name": "RED Engine", "short_name": "RED", "start_url": "/", "display": "standalone"}`))
}

func (h *handler) searchIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// Provide an empty JSON array as a placeholder for future search functionality
	w.Write([]byte("[]"))
}
