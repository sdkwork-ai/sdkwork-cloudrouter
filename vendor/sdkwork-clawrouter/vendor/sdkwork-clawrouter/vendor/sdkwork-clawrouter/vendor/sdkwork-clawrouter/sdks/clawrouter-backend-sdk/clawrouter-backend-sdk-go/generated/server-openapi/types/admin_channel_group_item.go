package types

// Persisted channel group snapshot returned by the backend.
type AdminChannelGroupItem struct {
	AccountCount AdminCountPair `json:"accountCount"`
	Capacity AdminCapacityPair `json:"capacity"`
	GroupCode string `json:"groupCode"`
	GroupName string `json:"groupName"`
	GroupType string `json:"groupType"`
	Id string `json:"id"`
	OfficialPriceMultiplier float64 `json:"officialPriceMultiplier"`
	PriceReferenceMode string `json:"priceReferenceMode"`
	ProviderCode string `json:"providerCode"`
	RateMultiplier float64 `json:"rateMultiplier"`
	ResourceCodes []string `json:"resourceCodes"`
	ResourceGroupCodes []string `json:"resourceGroupCodes"`
	Status string `json:"status"`
	Usage AdminUsagePair `json:"usage"`
}
