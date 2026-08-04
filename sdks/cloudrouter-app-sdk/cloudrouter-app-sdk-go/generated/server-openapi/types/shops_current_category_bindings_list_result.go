package types

// Shops current category bindings list result schema exposed by Cloud Router.
type ShopsCurrentCategoryBindingsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
