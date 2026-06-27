package types

// Bindings list result schema exposed by Claw Router.
type BindingsListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
