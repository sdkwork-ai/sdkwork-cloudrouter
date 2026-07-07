package types

// Channel groups list result schema exposed by Claw Router.
type ChannelGroupsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
