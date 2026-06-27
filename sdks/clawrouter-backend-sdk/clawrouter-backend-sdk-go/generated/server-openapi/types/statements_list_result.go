package types

// Statements list result schema exposed by Claw Router.
type StatementsListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
