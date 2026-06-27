package types

// Admin model limit create request schema exposed by Claw Router.
type AdminModelLimitCreateRequest struct {
	ChannelGroup string `json:"channelGroup"`
	Model string `json:"model"`
	Rpm int `json:"rpm"`
	Status string `json:"status"`
	Tpm int `json:"tpm"`
}
