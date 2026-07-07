package types

// Shops policies create result schema exposed by Claw Router.
type ShopsPoliciesCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
