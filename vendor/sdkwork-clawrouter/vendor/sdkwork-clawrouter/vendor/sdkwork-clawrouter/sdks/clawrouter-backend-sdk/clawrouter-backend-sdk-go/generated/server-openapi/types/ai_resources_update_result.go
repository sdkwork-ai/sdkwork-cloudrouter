package types

// Ai resources update result schema exposed by Claw Router.
type AiResourcesUpdateResult struct {
	Code string `json:"code"`
	Data AdminAiResourceMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
