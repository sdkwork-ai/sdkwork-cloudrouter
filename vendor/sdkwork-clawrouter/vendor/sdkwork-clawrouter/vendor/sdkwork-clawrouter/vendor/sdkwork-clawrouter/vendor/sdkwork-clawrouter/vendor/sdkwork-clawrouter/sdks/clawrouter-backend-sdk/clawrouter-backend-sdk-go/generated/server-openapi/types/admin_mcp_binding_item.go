package types

// Admin mcp binding item schema exposed by Claw Router.
type AdminMcpBindingItem struct {
	AllowedTools []string `json:"allowedTools"`
	CreatedAt string `json:"createdAt"`
	DeniedTools []string `json:"deniedTools"`
	Enabled bool `json:"enabled"`
	Id string `json:"id"`
	OrganizationId string `json:"organizationId"`
	OwnerId string `json:"ownerId"`
	OwnerType string `json:"ownerType"`
	PolicyJson map[string]JsonValue `json:"policyJson"`
	Priority int `json:"priority"`
	ServerId string `json:"serverId"`
	ServerRevisionId string `json:"serverRevisionId"`
	SnapshotJson map[string]JsonValue `json:"snapshotJson"`
	Status string `json:"status"`
	TenantId string `json:"tenantId"`
	ToolId string `json:"toolId"`
	UpdatedAt string `json:"updatedAt"`
	Uuid string `json:"uuid"`
}
