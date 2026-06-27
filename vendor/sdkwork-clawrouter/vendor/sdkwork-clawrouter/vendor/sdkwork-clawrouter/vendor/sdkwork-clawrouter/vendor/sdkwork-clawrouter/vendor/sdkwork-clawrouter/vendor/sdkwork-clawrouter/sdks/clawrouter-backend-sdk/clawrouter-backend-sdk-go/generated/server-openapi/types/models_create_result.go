package types

// Models create result schema exposed by Claw Router.
type ModelsCreateResult struct {
	Code string `json:"code"`
	Data AdminAiModelMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
