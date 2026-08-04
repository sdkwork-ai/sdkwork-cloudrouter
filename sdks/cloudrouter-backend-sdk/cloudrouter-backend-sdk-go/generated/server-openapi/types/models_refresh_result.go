package types

// Models refresh result schema exposed by Cloud Router.
type ModelsRefreshResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
