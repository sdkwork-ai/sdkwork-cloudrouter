package types

// Shops current products create result schema exposed by Cloud Router.
type ShopsCurrentProductsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
