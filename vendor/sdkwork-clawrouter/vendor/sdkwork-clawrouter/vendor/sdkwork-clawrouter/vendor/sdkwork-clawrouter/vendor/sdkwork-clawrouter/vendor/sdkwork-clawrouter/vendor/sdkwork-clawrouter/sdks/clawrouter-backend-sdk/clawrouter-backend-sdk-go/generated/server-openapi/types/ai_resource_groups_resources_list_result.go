package types

// Ai resource groups resources list result schema exposed by Claw Router.
type AiResourceGroupsResourcesListResult struct {
	Code string `json:"code"`
	Data AdminAiResourceGroupResourcesResponse `json:"data"`
	Msg string `json:"msg"`
}
