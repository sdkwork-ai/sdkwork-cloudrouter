package types

// Admin prompt binding item schema exposed by Claw Router.
type AdminPromptBindingItem struct {
	BindingRole string `json:"bindingRole"`
	CreatedAt string `json:"createdAt"`
	Enabled bool `json:"enabled"`
	Id string `json:"id"`
	OrganizationId string `json:"organizationId"`
	OwnerId string `json:"ownerId"`
	OwnerType string `json:"ownerType"`
	PolicyJson map[string]JsonValue `json:"policyJson"`
	Priority int `json:"priority"`
	PromptId string `json:"promptId"`
	PromptVersionId string `json:"promptVersionId"`
	SnapshotJson map[string]JsonValue `json:"snapshotJson"`
	TenantId string `json:"tenantId"`
	UpdatedAt string `json:"updatedAt"`
	Uuid string `json:"uuid"`
}
