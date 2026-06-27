package types

// Channels list result schema exposed by Claw Router.
type ChannelsListResult struct {
	Code string `json:"code"`
	Data AdminChannelsResponse `json:"data"`
	Msg string `json:"msg"`
}
