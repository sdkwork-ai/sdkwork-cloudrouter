package types

// Provider accounts create result schema exposed by Claw Router.
type ProviderAccountsCreateResult struct {
	Code string `json:"code"`
	Data MessagingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
