package types

// Channel groups channel bindings list result schema exposed by Claw Router.
type ChannelGroupsChannelBindingsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
