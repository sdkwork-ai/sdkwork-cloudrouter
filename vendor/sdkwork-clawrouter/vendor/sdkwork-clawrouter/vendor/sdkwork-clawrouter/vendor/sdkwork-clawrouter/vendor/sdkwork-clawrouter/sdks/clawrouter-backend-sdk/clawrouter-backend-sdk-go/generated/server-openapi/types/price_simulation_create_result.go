package types

// Price simulation create result schema exposed by Claw Router.
type PriceSimulationCreateResult struct {
	Code string `json:"code"`
	Data ServiceProviderPriceSimulationResponse `json:"data"`
	Msg string `json:"msg"`
}
