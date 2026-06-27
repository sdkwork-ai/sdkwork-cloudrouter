package types

// Definitions create result schema exposed by Claw Router.
type DefinitionsCreateResult struct {
	Code string `json:"code"`
	Data AdminPromptMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
