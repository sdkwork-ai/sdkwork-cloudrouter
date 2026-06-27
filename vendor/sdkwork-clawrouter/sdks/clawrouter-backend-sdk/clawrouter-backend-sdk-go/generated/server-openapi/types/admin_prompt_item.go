package types

// Admin prompt item schema exposed by Claw Router.
type AdminPromptItem struct {
	CategoryCode string `json:"categoryCode"`
	CategoryId string `json:"categoryId"`
	CreatedAt string `json:"createdAt"`
	Description string `json:"description"`
	Id string `json:"id"`
	LatestVersionId string `json:"latestVersionId"`
	Name string `json:"name"`
	OrganizationId string `json:"organizationId"`
	OwnerUserId string `json:"ownerUserId"`
	PromptKey string `json:"promptKey"`
	PromptType string `json:"promptType"`
	PublishedVersionId string `json:"publishedVersionId"`
	Status string `json:"status"`
	Tags []string `json:"tags"`
	TenantId string `json:"tenantId"`
	UpdatedAt string `json:"updatedAt"`
	Uuid string `json:"uuid"`
	Visibility string `json:"visibility"`
}
