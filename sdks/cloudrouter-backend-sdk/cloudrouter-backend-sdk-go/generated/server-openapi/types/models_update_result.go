package types

// Models update result schema exposed by Cloud Router.
type ModelsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
