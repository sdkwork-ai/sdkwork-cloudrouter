package types

// Adjustments list result schema exposed by Claw Router.
type AdjustmentsListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
