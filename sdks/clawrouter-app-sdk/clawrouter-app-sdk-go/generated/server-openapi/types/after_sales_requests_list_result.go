package types

// After sales requests list result schema exposed by Claw Router.
type AfterSalesRequestsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
