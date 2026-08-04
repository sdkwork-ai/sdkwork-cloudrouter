package types

// Shops close result schema exposed by Cloud Router.
type ShopsCloseResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
