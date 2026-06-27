package types

// Models list result schema exposed by Claw Router.
type ModelsListResult struct {
	Code string `json:"code"`
	Data AdminAiModelsResponse `json:"data"`
	Msg string `json:"msg"`
}
