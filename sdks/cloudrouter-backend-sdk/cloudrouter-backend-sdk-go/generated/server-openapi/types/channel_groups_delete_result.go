package types

// Channel groups delete result schema exposed by Cloud Router.
type ChannelGroupsDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
