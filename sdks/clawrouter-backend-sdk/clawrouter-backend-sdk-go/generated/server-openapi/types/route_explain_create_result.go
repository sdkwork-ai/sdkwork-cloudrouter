package types

// Route explain create result schema exposed by Claw Router.
type RouteExplainCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
