package types

// Api keys list result schema exposed by Cloud Router.
type ApiKeysListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
