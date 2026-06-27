package types

// Servers revisions list result schema exposed by Claw Router.
type ServersRevisionsListResult struct {
	Code string `json:"code"`
	Data AdminMcpServerRevisionListResponse `json:"data"`
	Msg string `json:"msg"`
}
