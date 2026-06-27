package types

// Provider registry list result schema exposed by Claw Router.
type ProviderRegistryListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
