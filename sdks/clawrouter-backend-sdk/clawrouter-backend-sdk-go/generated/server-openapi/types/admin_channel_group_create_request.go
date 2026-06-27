package types

// Admin channel group create request schema exposed by Claw Router.
type AdminChannelGroupCreateRequest struct {
	Capacity map[string]interface{} `json:"capacity"`
	GroupCode string `json:"groupCode"`
	GroupName string `json:"groupName"`
	GroupType string `json:"groupType"`
	OfficialPriceMultiplier float64 `json:"officialPriceMultiplier"`
	PriceReferenceMode string `json:"priceReferenceMode"`
	RateMultiplier float64 `json:"rateMultiplier"`
	ResourceCodes []string `json:"resourceCodes"`
	ResourceGroupCodes []string `json:"resourceGroupCodes"`
	Status string `json:"status"`
}
