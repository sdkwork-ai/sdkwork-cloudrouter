package types

// Shops update result schema exposed by Cloud Router.
type ShopsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
