package types

// Channel groups list result schema exposed by Claw Router.
type ChannelGroupsListResult struct {
	Code string `json:"code"`
	Data AppChannelGroupListResponse `json:"data"`
	Msg string `json:"msg"`
}
