package types

// Channel groups update result schema exposed by Claw Router.
type ChannelGroupsUpdateResult struct {
	Code string `json:"code"`
	Data AdminChannelGroupMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
