package types

// Ai resource groups create result schema exposed by Claw Router.
type AiResourceGroupsCreateResult struct {
	Code string `json:"code"`
	Data AdminAiResourceGroupMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
