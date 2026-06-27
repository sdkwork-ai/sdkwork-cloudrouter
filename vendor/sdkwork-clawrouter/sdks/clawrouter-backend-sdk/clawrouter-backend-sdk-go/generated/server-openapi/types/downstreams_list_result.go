package types

// Downstreams list result schema exposed by Claw Router.
type DownstreamsListResult struct {
	Code string `json:"code"`
	Data ServiceProviderCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
