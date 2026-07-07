package types

// Models delete result schema exposed by Claw Router.
type ModelsDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
