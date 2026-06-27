package types

// Admin runtime route explain candidate schema exposed by Claw Router.
type AdminRuntimeRouteExplainCandidate struct {
	ApiCode string `json:"apiCode"`
	CatalogKey string `json:"catalogKey"`
	ChannelGroupCode string `json:"channelGroupCode"`
	ChannelGroupId string `json:"channelGroupId"`
	ChannelId string `json:"channelId"`
	CredentialId string `json:"credentialId"`
	CredentialRotation string `json:"credentialRotation"`
	Kind string `json:"kind"`
	PolicyId string `json:"policyId"`
	PricingPlanCode string `json:"pricingPlanCode"`
	ProviderCode string `json:"providerCode"`
	ProviderModel string `json:"providerModel"`
	RegionCode string `json:"regionCode"`
	RequestedModel string `json:"requestedModel"`
	RuleId string `json:"ruleId"`
	TimeoutMs int `json:"timeoutMs"`
}
