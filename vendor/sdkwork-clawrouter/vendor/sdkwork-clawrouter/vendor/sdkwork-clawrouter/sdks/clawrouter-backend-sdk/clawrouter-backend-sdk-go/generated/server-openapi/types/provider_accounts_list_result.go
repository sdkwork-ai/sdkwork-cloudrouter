package types

// Provider accounts list result schema exposed by Claw Router.
type ProviderAccountsListResult struct {
	Code string `json:"code"`
	Data MessagingCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
