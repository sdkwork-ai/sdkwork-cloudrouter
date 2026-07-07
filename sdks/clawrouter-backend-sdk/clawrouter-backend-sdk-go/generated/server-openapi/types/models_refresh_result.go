package types

// Models refresh result schema exposed by Claw Router.
type ModelsRefreshResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
