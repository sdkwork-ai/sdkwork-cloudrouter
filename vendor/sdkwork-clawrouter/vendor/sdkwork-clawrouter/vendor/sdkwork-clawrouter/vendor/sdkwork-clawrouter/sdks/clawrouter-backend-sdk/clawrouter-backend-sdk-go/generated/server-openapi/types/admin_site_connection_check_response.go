package types

// Admin site connection check response schema exposed by Claw Router.
type AdminSiteConnectionCheckResponse struct {
	CheckedAt string `json:"checkedAt"`
	HealthStatus string `json:"healthStatus"`
	LatencyMs string `json:"latencyMs"`
	Message string `json:"message"`
	SiteId string `json:"siteId"`
	Status string `json:"status"`
}
