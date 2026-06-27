package types

// Service provider downstream create request schema exposed by Claw Router.
type ServiceProviderDownstreamCreateRequest struct {
	DefaultCurrency string `json:"defaultCurrency"`
	DefaultMultiplier string `json:"defaultMultiplier"`
	DisplayName string `json:"displayName"`
	PricePlanCode string `json:"pricePlanCode"`
	ProviderNo string `json:"providerNo"`
	ProviderType string `json:"providerType"`
	SellerProviderId string `json:"sellerProviderId"`
	SettlementMode string `json:"settlementMode"`
}
