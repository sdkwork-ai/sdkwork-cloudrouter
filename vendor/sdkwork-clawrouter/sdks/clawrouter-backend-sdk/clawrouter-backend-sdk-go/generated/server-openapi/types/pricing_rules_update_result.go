package types

// Pricing rules update result schema exposed by Claw Router.
type PricingRulesUpdateResult struct {
	Code string `json:"code"`
	Data ServiceProviderPricingRuleMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
