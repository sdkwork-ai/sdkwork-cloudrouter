package types

// Shops current products unpublish result schema exposed by Claw Router.
type ShopsCurrentProductsUnpublishResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
