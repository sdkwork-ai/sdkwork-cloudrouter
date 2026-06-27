package types

// Admin mcp server item schema exposed by Claw Router.
type AdminMcpServerItem struct {
	CategoryCode string `json:"categoryCode"`
	CategoryId string `json:"categoryId"`
	CreatedAt string `json:"createdAt"`
	DeprecatedAt string `json:"deprecatedAt"`
	Description string `json:"description"`
	HealthStatus string `json:"healthStatus"`
	Id string `json:"id"`
	LastCheckedAt string `json:"lastCheckedAt"`
	LastErrorMasked string `json:"lastErrorMasked"`
	LatestRevisionId string `json:"latestRevisionId"`
	Name string `json:"name"`
	OrganizationId string `json:"organizationId"`
	OwnerUserId string `json:"ownerUserId"`
	PublishedAt string `json:"publishedAt"`
	PublishedRevisionId string `json:"publishedRevisionId"`
	ServerKey string `json:"serverKey"`
	Status string `json:"status"`
	Tags []string `json:"tags"`
	TenantId string `json:"tenantId"`
	Transport string `json:"transport"`
	UpdatedAt string `json:"updatedAt"`
	Uuid string `json:"uuid"`
	Visibility string `json:"visibility"`
}
