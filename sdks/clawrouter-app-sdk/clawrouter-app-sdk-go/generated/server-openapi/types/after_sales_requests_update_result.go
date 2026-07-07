package types

// After sales requests update result schema exposed by Claw Router.
type AfterSalesRequestsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
