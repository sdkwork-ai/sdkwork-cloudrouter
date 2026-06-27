package types

// Version renders create result schema exposed by Claw Router.
type VersionRendersCreateResult struct {
	Code string `json:"code"`
	Data AdminPromptRenderResponse `json:"data"`
	Msg string `json:"msg"`
}
