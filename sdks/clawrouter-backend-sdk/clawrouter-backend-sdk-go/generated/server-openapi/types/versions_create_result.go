package types

// Versions create result schema exposed by Claw Router.
type VersionsCreateResult struct {
	Code string `json:"code"`
	Data AdminPromptVersionMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
