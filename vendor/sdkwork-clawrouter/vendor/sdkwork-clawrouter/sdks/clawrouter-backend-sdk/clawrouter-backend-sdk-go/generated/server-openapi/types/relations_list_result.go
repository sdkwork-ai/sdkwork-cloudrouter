package types

// Relations list result schema exposed by Claw Router.
type RelationsListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
