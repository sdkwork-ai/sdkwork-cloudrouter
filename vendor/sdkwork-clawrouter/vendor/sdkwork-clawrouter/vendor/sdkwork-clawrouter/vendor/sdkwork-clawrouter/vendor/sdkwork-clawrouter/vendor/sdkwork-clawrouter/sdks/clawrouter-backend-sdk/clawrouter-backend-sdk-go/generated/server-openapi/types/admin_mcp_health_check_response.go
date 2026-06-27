package types

// Admin mcp health check response schema exposed by Claw Router.
type AdminMcpHealthCheckResponse struct {
	CheckedAt string `json:"checkedAt"`
	ErrorMasked string `json:"errorMasked"`
	HealthStatus string `json:"healthStatus"`
	Healthy bool `json:"healthy"`
	LatencyMs string `json:"latencyMs"`
	ServerId string `json:"serverId"`
}
