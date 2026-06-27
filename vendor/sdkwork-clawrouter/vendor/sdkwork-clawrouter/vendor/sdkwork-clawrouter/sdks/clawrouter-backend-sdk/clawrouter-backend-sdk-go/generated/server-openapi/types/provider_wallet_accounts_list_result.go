package types

// Provider wallet accounts list result schema exposed by Claw Router.
type ProviderWalletAccountsListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
