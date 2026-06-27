package types

// Ai resources list result schema exposed by Claw Router.
type AiResourcesListResult struct {
	Code string `json:"code"`
	Data AdminAiResourcesResponse `json:"data"`
	Msg string `json:"msg"`
}
