package types

// Admin mcp tool update request schema exposed by Claw Router.
type AdminMcpToolUpdateRequest struct {
	Description string `json:"description"`
	Enabled bool `json:"enabled"`
	InputSchema map[string]JsonValue `json:"inputSchema"`
	Name string `json:"name"`
	OutputSchema map[string]JsonValue `json:"outputSchema"`
	RateLimitPolicy map[string]JsonValue `json:"rateLimitPolicy"`
	RequiresApproval bool `json:"requiresApproval"`
	RiskLevel string `json:"riskLevel"`
	SortWeight int `json:"sortWeight"`
	Status string `json:"status"`
}
