package types

// Shops current channels list result schema exposed by Claw Router.
type ShopsCurrentChannelsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
