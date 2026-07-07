package types

// Channels create result schema exposed by Claw Router.
type ChannelsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
