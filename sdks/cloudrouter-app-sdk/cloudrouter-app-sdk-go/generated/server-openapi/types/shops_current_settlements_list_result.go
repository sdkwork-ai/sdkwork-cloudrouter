package types

// Shops current settlements list result schema exposed by Cloud Router.
type ShopsCurrentSettlementsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
