package router

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/RED-Collective/red-engine/internal/node"
	"github.com/RED-Collective/red-engine/internal/registry"
)

// nodesPageData is the view model for the public /-/nodes directory page.
type nodesPageData struct {
	Self  nodeSelf
	Peers []nodeCard
}

// nodeSelf describes this node's own identity, shown in the page header so
// visitors know which node they are on and can add it as a peer.
type nodeSelf struct {
	Name           string
	PublicKey      string
	PublicKeyShort string
	PublicURL      string
	TunnelLabel    string
	Description    string
}

// nodeCard is a single peer entry rendered on the directory page.
type nodeCard struct {
	Name           string
	URL            string // contactable URL, scheme-normalised
	PublicKey      string
	PublicKeyShort string
	PeerType       string
	Description    string
	TunnelLabel    string
	IsOnline       bool
	ExportedPaths  []string
	LastSeen       string
}

// tunnelLabel maps a stored tunnel_type value to a human-readable badge.
func tunnelLabel(t string) string {
	switch t {
	case "cloudflare_quick":
		return "Cloudflare Quick"
	case "cloudflare_named":
		return "Cloudflare Named"
	case "direct":
		return "Direct"
	default:
		return ""
	}
}

// ensureScheme prepends https:// when a URL has no scheme, so links and the
// copy-URL button always produce something contactable.
func ensureScheme(u string) string {
	if u == "" {
		return ""
	}
	if !strings.HasPrefix(u, "http://") && !strings.HasPrefix(u, "https://") {
		return "https://" + u
	}
	return u
}

// shortKey returns the first 16 chars of a hex key for compact display.
func shortKey(k string) string {
	if len(k) > 16 {
		return k[:16]
	}
	return k
}

// relativeTime renders a coarse "time ago" string for last-seen timestamps.
func relativeTime(t time.Time) string {
	if t.IsZero() {
		return "never"
	}
	d := time.Since(t)
	switch {
	case d < time.Minute:
		return "just now"
	case d < time.Hour:
		m := int(d.Minutes())
		return fmt.Sprintf("%d min ago", m)
	case d < 24*time.Hour:
		return fmt.Sprintf("%d hr ago", int(d.Hours()))
	default:
		return fmt.Sprintf("%d days ago", int(d.Hours()/24))
	}
}

// nodes serves GET /-/nodes — a human-readable directory of known peers.
// Unauthenticated and server-side rendered. Online status is read from the
// cached health columns, never live-probed on render.
func (h *handler) nodes(w http.ResponseWriter, r *http.Request) {
	peers, err := registry.ListPeers()
	if err != nil {
		http.Error(w, "Failed to list peers", http.StatusInternalServerError)
		return
	}

	cards := make([]nodeCard, 0, len(peers))
	for _, p := range peers {
		contact := p.PublicURL
		if contact == "" {
			contact = p.URL
		}
		paths := p.ExportedPaths
		if paths == nil {
			paths = []string{}
		}
		cards = append(cards, nodeCard{
			Name:           p.Name,
			URL:            ensureScheme(contact),
			PublicKey:      p.PublicKey,
			PublicKeyShort: shortKey(p.PublicKey),
			PeerType:       p.PeerType,
			Description:    p.Description,
			TunnelLabel:    tunnelLabel(p.TunnelType),
			IsOnline:       p.IsOnline,
			ExportedPaths:  paths,
			LastSeen:       relativeTime(p.LastSeen),
		})
	}

	selfKey := node.GetNodePublicKey()
	data := nodesPageData{
		Self: nodeSelf{
			Name:           h.nodeName(),
			PublicKey:      selfKey,
			PublicKeyShort: shortKey(selfKey),
			PublicURL:      ensureScheme(registry.GetSetting("public_url")),
			TunnelLabel:    tunnelLabel(registry.GetSetting("tunnel_type")),
			Description:    registry.GetSetting("node_description"),
		},
		Peers: cards,
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := h.nodesTmpl.ExecuteTemplate(w, "nodes.html", data); err != nil {
		http.Error(w, "Nodes template execution error: "+err.Error(), http.StatusInternalServerError)
	}
}
