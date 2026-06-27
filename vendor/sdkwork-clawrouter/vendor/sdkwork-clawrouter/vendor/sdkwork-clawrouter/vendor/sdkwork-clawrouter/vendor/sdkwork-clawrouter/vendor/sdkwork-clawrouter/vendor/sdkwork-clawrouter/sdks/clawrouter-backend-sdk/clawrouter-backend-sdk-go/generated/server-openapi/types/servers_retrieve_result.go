package types

// Servers retrieve result schema exposed by Claw Router.
type ServersRetrieveResult struct {
	Code string `json:"code"`
	Data AdminMcpServerMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
