package types

// Admin mcp binding list response schema exposed by Claw Router.
type AdminMcpBindingListResponse struct {
	Items []AdminMcpBindingItem `json:"items"`
}
