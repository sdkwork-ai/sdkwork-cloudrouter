package types

// Shops suspend result schema exposed by Claw Router.
type ShopsSuspendResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
