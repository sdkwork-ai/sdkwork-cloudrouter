package types

// Servers update result schema exposed by Claw Router.
type ServersUpdateResult struct {
	Code string `json:"code"`
	Data AdminMcpServerMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
