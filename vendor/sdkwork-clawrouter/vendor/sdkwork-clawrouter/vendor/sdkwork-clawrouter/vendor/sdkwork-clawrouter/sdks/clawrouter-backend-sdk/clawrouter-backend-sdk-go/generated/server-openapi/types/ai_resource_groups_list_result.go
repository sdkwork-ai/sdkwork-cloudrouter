package types

// Ai resource groups list result schema exposed by Claw Router.
type AiResourceGroupsListResult struct {
	Code string `json:"code"`
	Data AdminAiResourceGroupsResponse `json:"data"`
	Msg string `json:"msg"`
}
