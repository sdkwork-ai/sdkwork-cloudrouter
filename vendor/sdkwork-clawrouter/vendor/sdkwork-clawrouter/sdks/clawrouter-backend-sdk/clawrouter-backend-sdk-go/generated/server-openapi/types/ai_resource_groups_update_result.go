package types

// Ai resource groups update result schema exposed by Claw Router.
type AiResourceGroupsUpdateResult struct {
	Code string `json:"code"`
	Data AdminAiResourceGroupMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
