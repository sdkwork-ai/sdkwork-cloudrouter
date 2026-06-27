package types

// Ai resources create result schema exposed by Claw Router.
type AiResourcesCreateResult struct {
	Code string `json:"code"`
	Data AdminAiResourceMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
