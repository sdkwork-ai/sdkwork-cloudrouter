package types

// Channel groups create result schema exposed by Claw Router.
type ChannelGroupsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
