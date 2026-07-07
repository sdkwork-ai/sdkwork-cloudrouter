package types

// Site settings update result schema exposed by Claw Router.
type SiteSettingsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
