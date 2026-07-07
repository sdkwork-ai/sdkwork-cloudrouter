package types

// Models list result schema exposed by Claw Router.
type ModelsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
