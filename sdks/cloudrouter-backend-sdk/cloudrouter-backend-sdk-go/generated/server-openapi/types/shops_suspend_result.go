package types

// Shops suspend result schema exposed by Cloud Router.
type ShopsSuspendResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
