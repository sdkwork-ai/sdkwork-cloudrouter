package types

// Admin site channel item schema exposed by Claw Router.
type AdminSiteChannelItem struct {
	ChannelCode string `json:"channelCode"`
	ChannelName string `json:"channelName"`
	HealthStatus string `json:"healthStatus"`
	Id string `json:"id"`
	ProviderCode string `json:"providerCode"`
	SiteChannelRole string `json:"siteChannelRole"`
	SiteCode string `json:"siteCode"`
	SiteServiceCode string `json:"siteServiceCode"`
	Status string `json:"status"`
}
