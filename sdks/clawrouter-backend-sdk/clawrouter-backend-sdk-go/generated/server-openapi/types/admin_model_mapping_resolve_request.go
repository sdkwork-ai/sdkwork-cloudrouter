package types

// Admin model mapping resolve request schema exposed by Claw Router.
type AdminModelMappingResolveRequest struct {
	ChannelCode string `json:"channelCode"`
	ChannelId string `json:"channelId"`
	ProviderAccountCode string `json:"providerAccountCode"`
	ProviderAccountId string `json:"providerAccountId"`
	SourceModel string `json:"sourceModel"`
	VendorCode string `json:"vendorCode"`
}
