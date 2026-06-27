package types

// Service nodes status update result schema exposed by Claw Router.
type ServiceNodesStatusUpdateResult struct {
	Code string `json:"code"`
	Data AdminServiceNodeMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
