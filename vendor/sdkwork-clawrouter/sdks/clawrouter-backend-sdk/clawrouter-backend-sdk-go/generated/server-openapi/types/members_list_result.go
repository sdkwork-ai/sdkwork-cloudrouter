package types

// Members list result schema exposed by Claw Router.
type MembersListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
