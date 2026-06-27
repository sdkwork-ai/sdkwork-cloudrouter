package types

// Admin ai resource groups response schema exposed by Claw Router.
type AdminAiResourceGroupsResponse struct {
	Items []AdminAiResourceGroupItem `json:"items"`
}
