package types

// Servers tools list result schema exposed by Claw Router.
type ServersToolsListResult struct {
	Code string `json:"code"`
	Data AdminMcpToolListResponse `json:"data"`
	Msg string `json:"msg"`
}
