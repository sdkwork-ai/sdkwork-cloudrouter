package types

// Service provider downstream mutation response schema exposed by Claw Router.
type ServiceProviderDownstreamMutationResponse struct {
	Item map[string]interface{} `json:"item"`
}
