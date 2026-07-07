package types

// Shops deposit account review result schema exposed by Claw Router.
type ShopsDepositAccountReviewResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
