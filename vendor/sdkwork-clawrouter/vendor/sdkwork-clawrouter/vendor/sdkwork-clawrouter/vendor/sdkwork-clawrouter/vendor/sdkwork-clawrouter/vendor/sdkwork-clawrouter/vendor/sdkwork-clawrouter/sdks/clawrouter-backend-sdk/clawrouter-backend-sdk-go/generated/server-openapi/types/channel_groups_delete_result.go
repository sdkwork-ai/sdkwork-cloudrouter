package types

// Channel groups delete result schema exposed by Claw Router.
type ChannelGroupsDeleteResult struct {
	Code string `json:"code"`
	Data AdminDeleteResponse `json:"data"`
	Msg string `json:"msg"`
}
