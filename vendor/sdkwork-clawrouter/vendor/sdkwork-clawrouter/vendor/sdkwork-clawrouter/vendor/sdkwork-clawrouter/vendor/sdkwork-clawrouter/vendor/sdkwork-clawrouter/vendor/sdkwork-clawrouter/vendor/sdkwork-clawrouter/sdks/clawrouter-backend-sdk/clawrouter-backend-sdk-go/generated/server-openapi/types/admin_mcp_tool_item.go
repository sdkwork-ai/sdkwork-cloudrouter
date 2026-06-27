package types

// Admin mcp tool item schema exposed by Claw Router.
type AdminMcpToolItem struct {
	CreatedAt string `json:"createdAt"`
	Description string `json:"description"`
	DiscoveredAt string `json:"discoveredAt"`
	Enabled bool `json:"enabled"`
	Id string `json:"id"`
	InputSchema map[string]JsonValue `json:"inputSchema"`
	LastInvokedAt string `json:"lastInvokedAt"`
	Name string `json:"name"`
	OrganizationId string `json:"organizationId"`
	OutputSchema map[string]JsonValue `json:"outputSchema"`
	RateLimitPolicy map[string]JsonValue `json:"rateLimitPolicy"`
	RequiresApproval bool `json:"requiresApproval"`
	RiskLevel string `json:"riskLevel"`
	SchemaHash string `json:"schemaHash"`
	ServerId string `json:"serverId"`
	ServerRevisionId string `json:"serverRevisionId"`
	SortWeight int `json:"sortWeight"`
	Status string `json:"status"`
	TenantId string `json:"tenantId"`
	ToolKey string `json:"toolKey"`
	UpdatedAt string `json:"updatedAt"`
	Uuid string `json:"uuid"`
}
