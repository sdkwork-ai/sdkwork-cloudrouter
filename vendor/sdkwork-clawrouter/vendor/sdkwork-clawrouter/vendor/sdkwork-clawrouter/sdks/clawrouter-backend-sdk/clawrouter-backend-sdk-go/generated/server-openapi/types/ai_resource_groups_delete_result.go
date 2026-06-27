package types

// Ai resource groups delete result schema exposed by Claw Router.
type AiResourceGroupsDeleteResult struct {
	Code string `json:"code"`
	Data AdminAiResourceGroupDeleteResponse `json:"data"`
	Msg string `json:"msg"`
}
