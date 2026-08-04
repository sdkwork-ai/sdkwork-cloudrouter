package types

// Channels delete result schema exposed by Cloud Router.
type ChannelsDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
