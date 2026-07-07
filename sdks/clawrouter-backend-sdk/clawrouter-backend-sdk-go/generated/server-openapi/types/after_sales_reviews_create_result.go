package types

// After sales reviews create result schema exposed by Claw Router.
type AfterSalesReviewsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
