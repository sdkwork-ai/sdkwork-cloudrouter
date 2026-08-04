package types

// Channel groups update result schema exposed by Cloud Router.
type ChannelGroupsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
