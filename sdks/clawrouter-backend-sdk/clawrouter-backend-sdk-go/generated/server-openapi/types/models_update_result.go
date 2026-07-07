package types

// Models update result schema exposed by Claw Router.
type ModelsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
