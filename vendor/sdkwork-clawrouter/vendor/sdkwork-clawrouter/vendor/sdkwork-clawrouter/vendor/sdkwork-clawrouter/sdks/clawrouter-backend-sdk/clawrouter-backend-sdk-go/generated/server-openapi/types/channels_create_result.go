package types

// Channels create result schema exposed by Claw Router.
type ChannelsCreateResult struct {
	Code string `json:"code"`
	Data AdminChannelMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
