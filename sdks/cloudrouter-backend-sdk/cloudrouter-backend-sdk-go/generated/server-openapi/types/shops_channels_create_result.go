package types

// Shops channels create result schema exposed by Cloud Router.
type ShopsChannelsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
