package types

// Shops current products list result schema exposed by Claw Router.
type ShopsCurrentProductsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
