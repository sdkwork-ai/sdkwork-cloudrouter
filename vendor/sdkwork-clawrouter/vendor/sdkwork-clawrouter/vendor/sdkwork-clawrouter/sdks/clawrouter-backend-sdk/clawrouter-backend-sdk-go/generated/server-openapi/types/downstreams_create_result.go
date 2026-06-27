package types

// Downstreams create result schema exposed by Claw Router.
type DownstreamsCreateResult struct {
	Code string `json:"code"`
	Data ServiceProviderDownstreamMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
