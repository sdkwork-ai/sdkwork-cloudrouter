package types

// Service nodes create result schema exposed by Claw Router.
type ServiceNodesCreateResult struct {
	Code string `json:"code"`
	Data AdminServiceNodeMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
