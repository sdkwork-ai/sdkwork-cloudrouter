package types

// Site settings retrieve result schema exposed by Cloud Router.
type SiteSettingsRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
