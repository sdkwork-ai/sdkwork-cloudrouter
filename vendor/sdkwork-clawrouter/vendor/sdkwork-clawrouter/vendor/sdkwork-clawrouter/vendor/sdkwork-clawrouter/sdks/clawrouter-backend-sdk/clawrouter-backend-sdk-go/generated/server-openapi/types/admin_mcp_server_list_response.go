package types

// Admin mcp server list response schema exposed by Claw Router.
type AdminMcpServerListResponse struct {
	Items []AdminMcpServerItem `json:"items"`
}
