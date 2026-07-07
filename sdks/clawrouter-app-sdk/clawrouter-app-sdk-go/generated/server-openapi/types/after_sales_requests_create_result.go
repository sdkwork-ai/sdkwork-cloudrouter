package types

// After sales requests create result schema exposed by Claw Router.
type AfterSalesRequestsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
