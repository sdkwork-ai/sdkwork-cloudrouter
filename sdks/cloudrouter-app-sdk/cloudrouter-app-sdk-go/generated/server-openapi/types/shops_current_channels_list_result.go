package types

// Shops current channels list result schema exposed by Cloud Router.
type ShopsCurrentChannelsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
