package types

// Shops create result schema exposed by Cloud Router.
type ShopsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
