package types

// Models create result schema exposed by Cloud Router.
type ModelsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
