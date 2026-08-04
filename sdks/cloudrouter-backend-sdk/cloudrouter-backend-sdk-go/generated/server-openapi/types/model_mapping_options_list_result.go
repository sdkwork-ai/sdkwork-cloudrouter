package types

// Model mapping options list result schema exposed by Cloud Router.
type ModelMappingOptionsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
