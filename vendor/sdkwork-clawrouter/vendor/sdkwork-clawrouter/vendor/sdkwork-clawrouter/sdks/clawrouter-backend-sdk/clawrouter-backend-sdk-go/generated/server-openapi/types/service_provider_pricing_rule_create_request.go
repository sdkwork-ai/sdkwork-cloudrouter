package types

// Service provider pricing rule create request schema exposed by Claw Router.
type ServiceProviderPricingRuleCreateRequest struct {
	BillingMeterCode string `json:"billingMeterCode"`
	BuyerProviderId string `json:"buyerProviderId"`
	CatalogKey string `json:"catalogKey"`
	Currency string `json:"currency"`
	EdgeId string `json:"edgeId"`
	MinimumCharge string `json:"minimumCharge"`
	Model string `json:"model"`
	PricePlanId string `json:"pricePlanId"`
	Priority int `json:"priority"`
	SellerProviderId string `json:"sellerProviderId"`
	TokenKind string `json:"tokenKind"`
	UnitPrice string `json:"unitPrice"`
	UnitSize string `json:"unitSize"`
}
