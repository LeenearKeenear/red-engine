package node

// NodeInfo is the public metadata a node exposes at /-/nodeinfo.
type NodeInfo struct {
	Name            string   `json:"name"`
	PublicKey       string   `json:"public_key"` // stable Ed25519 identity anchor
	SoftwareVersion string   `json:"software_version"`
	ExportedPaths   []string `json:"exported_paths"`
	PublicURL       string   `json:"public_url,omitempty"`  // self-reported public URL
	TunnelType      string   `json:"tunnel_type,omitempty"` // "direct"|"cloudflare_quick"|"cloudflare_named"
	Description     string   `json:"description,omitempty"`
}

// GetNodeInfo returns the node's public metadata. The public key is read from
// the node identity; publicURL/tunnelType/description are supplied by the caller
// (sourced from node_settings at serve time).
func GetNodeInfo(nodeName, version string, exportedPaths []string) *NodeInfo {
	return &NodeInfo{
		Name:            nodeName,
		PublicKey:       GetNodePublicKey(),
		SoftwareVersion: version,
		ExportedPaths:   exportedPaths,
	}
}
