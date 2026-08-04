package types

// Runtime region settings retrieve result schema exposed by Cloud Router.
type RuntimeRegionSettingsRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
