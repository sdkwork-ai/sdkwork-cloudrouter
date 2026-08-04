package types

// Shops submit review result schema exposed by Cloud Router.
type ShopsSubmitReviewResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
