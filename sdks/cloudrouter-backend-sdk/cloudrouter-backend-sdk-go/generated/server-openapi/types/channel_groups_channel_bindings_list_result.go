package types

// Channel groups channel bindings list result schema exposed by Cloud Router.
type ChannelGroupsChannelBindingsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
