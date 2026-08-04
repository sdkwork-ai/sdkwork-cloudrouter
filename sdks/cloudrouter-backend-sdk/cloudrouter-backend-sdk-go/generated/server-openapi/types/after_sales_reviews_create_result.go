package types

// After sales reviews create result schema exposed by Cloud Router.
type AfterSalesReviewsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
