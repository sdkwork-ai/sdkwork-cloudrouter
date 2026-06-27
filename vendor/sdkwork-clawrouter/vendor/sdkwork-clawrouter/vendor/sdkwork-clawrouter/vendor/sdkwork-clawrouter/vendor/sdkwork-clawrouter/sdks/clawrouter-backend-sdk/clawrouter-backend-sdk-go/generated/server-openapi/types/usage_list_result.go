package types

// Usage list result schema exposed by Claw Router.
type UsageListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
