package types

// Service provider pricing rule update request schema exposed by Claw Router.
type ServiceProviderPricingRuleUpdateRequest struct {
	MinimumCharge string `json:"minimumCharge"`
	Priority int `json:"priority"`
	Status string `json:"status"`
	UnitPrice string `json:"unitPrice"`
	UnitSize string `json:"unitSize"`
}
