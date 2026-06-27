package types

// Servers revisions create result schema exposed by Claw Router.
type ServersRevisionsCreateResult struct {
	Code string `json:"code"`
	Data AdminMcpServerRevisionMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
