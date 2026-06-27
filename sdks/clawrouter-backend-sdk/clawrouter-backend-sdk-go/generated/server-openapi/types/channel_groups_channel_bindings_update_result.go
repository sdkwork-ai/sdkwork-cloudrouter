package types

// Channel groups channel bindings update result schema exposed by Claw Router.
type ChannelGroupsChannelBindingsUpdateResult struct {
	Code string `json:"code"`
	Data AdminChannelGroupChannelBindingsResponse `json:"data"`
	Msg string `json:"msg"`
}
