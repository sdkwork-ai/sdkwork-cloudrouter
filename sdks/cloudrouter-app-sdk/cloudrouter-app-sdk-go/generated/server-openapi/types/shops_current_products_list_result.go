package types

// Shops current products list result schema exposed by Cloud Router.
type ShopsCurrentProductsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
