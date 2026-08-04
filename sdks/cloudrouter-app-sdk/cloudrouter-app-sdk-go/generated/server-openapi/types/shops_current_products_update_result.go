package types

// Shops current products update result schema exposed by Cloud Router.
type ShopsCurrentProductsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
