package types

// Servers list result schema exposed by Claw Router.
type ServersListResult struct {
	Code string `json:"code"`
	Data AdminMcpServerListResponse `json:"data"`
	Msg string `json:"msg"`
}
