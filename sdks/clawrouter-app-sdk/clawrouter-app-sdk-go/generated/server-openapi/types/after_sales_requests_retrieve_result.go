package types

// After sales requests retrieve result schema exposed by Claw Router.
type AfterSalesRequestsRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
