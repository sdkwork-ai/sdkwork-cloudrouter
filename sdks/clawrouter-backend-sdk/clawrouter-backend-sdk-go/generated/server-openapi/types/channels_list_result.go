package types

// Channels list result schema exposed by Claw Router.
type ChannelsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
