package types

// Service provider price simulation response schema exposed by Claw Router.
type ServiceProviderPriceSimulationResponse struct {
	Item map[string]interface{} `json:"item"`
}
