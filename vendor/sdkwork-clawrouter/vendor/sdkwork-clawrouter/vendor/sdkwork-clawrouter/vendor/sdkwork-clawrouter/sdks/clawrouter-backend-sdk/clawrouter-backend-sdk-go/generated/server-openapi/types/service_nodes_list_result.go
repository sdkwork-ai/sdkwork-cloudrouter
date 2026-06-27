package types

// Service nodes list result schema exposed by Claw Router.
type ServiceNodesListResult struct {
	Code string `json:"code"`
	Data AdminServiceNodesResponse `json:"data"`
	Msg string `json:"msg"`
}
