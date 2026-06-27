package types

// Service nodes delete result schema exposed by Claw Router.
type ServiceNodesDeleteResult struct {
	Code string `json:"code"`
	Data AdminServiceNodeDeleteResponse `json:"data"`
	Msg string `json:"msg"`
}
