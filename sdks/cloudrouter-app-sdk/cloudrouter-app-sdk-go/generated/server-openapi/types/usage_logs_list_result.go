package types

// Usage logs list result schema exposed by Cloud Router.
type UsageLogsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
