package types

// Models update result schema exposed by Claw Router.
type ModelsUpdateResult struct {
	Code string `json:"code"`
	Data AdminAiModelMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
