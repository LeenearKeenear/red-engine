package router

import (
	"encoding/json"
	"net/http"

	"github.com/RED-Collective/red-engine/internal/models"
)

const contributorsFile = "contributors.json"

// deleteContributor removes a contributor by public key
func loadContributors() ([]models.Contributor, error) {
	rows, err := registry.DB.Query(`SELECT public_key, name FROM trusted_authors WHERE revoked = 0`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var contributors []models.Contributor
	for rows.Next() {
		var c models.Contributor
		if err := rows.Scan(&c.PublicKey, &c.Name); err != nil {
			return nil, err
		}
		contributors = append(contributors, c)
	}
	return contributors, nil
}

// addContributorToDB adds a contributor directly to the SQLite database.
func (h *handler) addContributorToDB(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name      string `json:"name"`
		PublicKey string `json:"public_key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if req.Name == "" || req.PublicKey == "" {
		http.Error(w, "Name and public_key are required", http.StatusBadRequest)
		return
	}
	if len(req.PublicKey) != 64 {
		http.Error(w, "Public key must be a 64-character hex string", http.StatusBadRequest)
		return
	}

	db := registry.GetDB()
	if db == nil {
		http.Error(w, "Database not initialised", http.StatusInternalServerError)
		return
	}

	// Insert or update, unrevoke if previously revoked
	_, err := db.Exec(`
        INSERT INTO trusted_authors (public_key, name, imported_from, revoked)
        VALUES (?, ?, ?, 0)
        ON CONFLICT(public_key) DO UPDATE SET
            name = excluded.name,
            revoked = 0,
            revoked_at = NULL
    `, req.PublicKey, req.Name, "local")
	if err != nil {
		http.Error(w, "Failed to save contributor: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(req)
}

// revokeContributor marks a contributor as revoked (soft delete).
func (h *handler) revokeContributor(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PublicKey string `json:"public_key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if req.PublicKey == "" {
		http.Error(w, "public_key is required", http.StatusBadRequest)
		return
	}

	db := registry.GetDB()
	if db == nil {
		http.Error(w, "Database not initialised", http.StatusInternalServerError)
		return
	}

	result, err := db.Exec(`
        UPDATE trusted_authors
        SET revoked = 1, revoked_at = CURRENT_TIMESTAMP
        WHERE public_key = ? AND revoked = 0
    `, req.PublicKey)
	if err != nil {
		http.Error(w, "Failed to revoke contributor: "+err.Error(), http.StatusInternalServerError)
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, "Public key not found or already revoked", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("revoked"))
}

// revokeContributor marks a contributor as revoked (soft delete).
func (h *handler) revokeContributor(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PublicKey string `json:"public_key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if req.PublicKey == "" {
		http.Error(w, "public_key is required", http.StatusBadRequest)
		return
	}

	db := registry.GetDB()
	if db == nil {
		http.Error(w, "Database not initialised", http.StatusInternalServerError)
		return
	}

	result, err := db.Exec(`
        UPDATE trusted_authors
        SET revoked = 1, revoked_at = CURRENT_TIMESTAMP
        WHERE public_key = ? AND revoked = 0
    `, req.PublicKey)
	if err != nil {
		http.Error(w, "Failed to revoke contributor: "+err.Error(), http.StatusInternalServerError)
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, "Public key not found or already revoked", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("revoked"))
}

func revokeContributor(pubkey string) error {
	_, err := registry.DB.Exec(`
        UPDATE trusted_authors
        SET revoked = 1, revoked_at = CURRENT_TIMESTAMP
        WHERE public_key = ?
    `, pubkey)
	return err
}
