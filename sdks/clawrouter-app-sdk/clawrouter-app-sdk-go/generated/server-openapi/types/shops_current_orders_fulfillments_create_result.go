package types

// Shops current orders fulfillments create result schema exposed by Claw Router.
type ShopsCurrentOrdersFulfillmentsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
