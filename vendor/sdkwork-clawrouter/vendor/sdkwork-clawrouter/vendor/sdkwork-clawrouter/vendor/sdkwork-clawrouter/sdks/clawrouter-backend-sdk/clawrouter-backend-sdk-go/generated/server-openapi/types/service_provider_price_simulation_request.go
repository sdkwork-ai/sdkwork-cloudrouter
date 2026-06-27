package types

// Service provider price simulation request schema exposed by Claw Router.
type ServiceProviderPriceSimulationRequest struct {
	BillingMeterCode string `json:"billingMeterCode"`
	BuyerProviderId string `json:"buyerProviderId"`
	CatalogKey string `json:"catalogKey"`
	Model string `json:"model"`
	Quantity string `json:"quantity"`
	TokenKind string `json:"tokenKind"`
}
