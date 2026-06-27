package types

// Admin channel group channel binding input schema exposed by Claw Router.
type AdminChannelGroupChannelBindingInput struct {
	ApiScope []string `json:"apiScope"`
	Capabilities []string `json:"capabilities"`
	ChannelId string `json:"channelId"`
	Priority int `json:"priority"`
	ResourceCodes []string `json:"resourceCodes"`
	Status string `json:"status"`
	Weight int `json:"weight"`
}
