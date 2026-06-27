package types

// Versions publish result schema exposed by Claw Router.
type VersionsPublishResult struct {
	Code string `json:"code"`
	Data AdminPromptVersionMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
