package types

// Channels update result schema exposed by Claw Router.
type ChannelsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
