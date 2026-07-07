package types

// Channel groups channel bindings update result schema exposed by Claw Router.
type ChannelGroupsChannelBindingsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
