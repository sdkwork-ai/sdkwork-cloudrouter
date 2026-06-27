package types

// Admin mcp discovery response schema exposed by Claw Router.
type AdminMcpDiscoveryResponse struct {
	CheckedAt string `json:"checkedAt"`
	DiscoveredCount string `json:"discoveredCount"`
	ServerId string `json:"serverId"`
	Tools []AdminMcpToolItem `json:"tools"`
}
