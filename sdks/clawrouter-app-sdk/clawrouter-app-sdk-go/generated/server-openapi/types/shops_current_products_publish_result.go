package types

// Shops current products publish result schema exposed by Claw Router.
type ShopsCurrentProductsPublishResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
