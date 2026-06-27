package types

// Channel groups channel bindings list result schema exposed by Claw Router.
type ChannelGroupsChannelBindingsListResult struct {
	Code string `json:"code"`
	Data AdminChannelGroupChannelBindingsResponse `json:"data"`
	Msg string `json:"msg"`
}
