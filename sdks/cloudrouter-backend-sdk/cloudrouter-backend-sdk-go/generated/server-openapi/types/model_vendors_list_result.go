package types

// Model vendors list result schema exposed by Cloud Router.
type ModelVendorsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
