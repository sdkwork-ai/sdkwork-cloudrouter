package types

// Records list result schema exposed by Cloud Router.
type RecordsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
