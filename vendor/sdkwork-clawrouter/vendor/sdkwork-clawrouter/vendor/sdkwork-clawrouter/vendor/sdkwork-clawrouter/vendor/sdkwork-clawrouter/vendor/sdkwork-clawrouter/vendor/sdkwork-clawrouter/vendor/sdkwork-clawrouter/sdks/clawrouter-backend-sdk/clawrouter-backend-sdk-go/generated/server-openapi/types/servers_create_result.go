package types

// Servers create result schema exposed by Claw Router.
type ServersCreateResult struct {
	Code string `json:"code"`
	Data AdminMcpServerMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
