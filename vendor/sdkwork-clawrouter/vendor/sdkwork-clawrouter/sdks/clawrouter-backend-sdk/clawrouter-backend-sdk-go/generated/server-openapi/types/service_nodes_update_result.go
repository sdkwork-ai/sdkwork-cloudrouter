package types

// Service nodes update result schema exposed by Claw Router.
type ServiceNodesUpdateResult struct {
	Code string `json:"code"`
	Data AdminServiceNodeMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
