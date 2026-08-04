package types

// Auth settings retrieve result schema exposed by Cloud Router.
type AuthSettingsRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
