package types

// Pricing rules create result schema exposed by Claw Router.
type PricingRulesCreateResult struct {
	Code string `json:"code"`
	Data ServiceProviderPricingRuleMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
