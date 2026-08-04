package types

// Auth settings update result schema exposed by Cloud Router.
type AuthSettingsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
