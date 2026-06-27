package types

// Admin ai resource group member input schema exposed by Claw Router.
type AdminAiResourceGroupMemberInput struct {
	ItemRole string `json:"itemRole"`
	ResourceCode string `json:"resourceCode"`
	SortOrder string `json:"sortOrder"`
}
