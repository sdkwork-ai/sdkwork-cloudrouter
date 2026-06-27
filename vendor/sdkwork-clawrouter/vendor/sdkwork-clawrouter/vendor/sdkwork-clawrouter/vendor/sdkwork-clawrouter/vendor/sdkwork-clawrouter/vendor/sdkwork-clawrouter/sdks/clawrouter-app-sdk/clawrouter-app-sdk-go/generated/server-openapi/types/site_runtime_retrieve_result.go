package types

// Site runtime retrieve result schema exposed by Claw Router.
type SiteRuntimeRetrieveResult struct {
	Code string `json:"code"`
	Data SiteRuntimeSettingsResponse `json:"data"`
	Msg string `json:"msg"`
}
