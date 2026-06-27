package types

// Contracts list result schema exposed by Claw Router.
type ContractsListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
