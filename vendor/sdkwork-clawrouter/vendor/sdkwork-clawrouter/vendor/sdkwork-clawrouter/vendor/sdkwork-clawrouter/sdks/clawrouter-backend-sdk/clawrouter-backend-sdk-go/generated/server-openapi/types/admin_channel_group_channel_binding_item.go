package types

// Admin channel group channel binding item schema exposed by Claw Router.
type AdminChannelGroupChannelBindingItem struct {
	ApiScope []string `json:"apiScope"`
	Capabilities []string `json:"capabilities"`
	ChannelCode string `json:"channelCode"`
	ChannelGroupId string `json:"channelGroupId"`
	ChannelId string `json:"channelId"`
	ChannelName string `json:"channelName"`
	HealthStatus string `json:"healthStatus"`
	Id string `json:"id"`
	Priority int `json:"priority"`
	ProviderCode string `json:"providerCode"`
	ProviderName string `json:"providerName"`
	ResourceCodes []string `json:"resourceCodes"`
	Status string `json:"status"`
	Weight int `json:"weight"`
}
