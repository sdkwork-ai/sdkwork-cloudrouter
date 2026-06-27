package types

// Admin mcp tool list response schema exposed by Claw Router.
type AdminMcpToolListResponse struct {
	Items []AdminMcpToolItem `json:"items"`
}
