package types

// Shops current orders list result schema exposed by Cloud Router.
type ShopsCurrentOrdersListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
