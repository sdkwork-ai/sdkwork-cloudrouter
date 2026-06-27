package types

// Channel groups create result schema exposed by Claw Router.
type ChannelGroupsCreateResult struct {
	Code string `json:"code"`
	Data AdminChannelGroupMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
