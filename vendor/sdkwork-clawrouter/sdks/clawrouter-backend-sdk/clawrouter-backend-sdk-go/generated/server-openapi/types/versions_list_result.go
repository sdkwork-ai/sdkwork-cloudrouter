package types

// Versions list result schema exposed by Claw Router.
type VersionsListResult struct {
	Code string `json:"code"`
	Data AdminPromptVersionListResponse `json:"data"`
	Msg string `json:"msg"`
}
