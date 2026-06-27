package types

// Definitions list result schema exposed by Claw Router.
type DefinitionsListResult struct {
	Code string `json:"code"`
	Data AdminPromptListResponse `json:"data"`
	Msg string `json:"msg"`
}
