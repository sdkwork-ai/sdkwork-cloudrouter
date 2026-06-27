package types

// Admin mcp server revision list response schema exposed by Claw Router.
type AdminMcpServerRevisionListResponse struct {
	Items []AdminMcpServerRevisionItem `json:"items"`
}
