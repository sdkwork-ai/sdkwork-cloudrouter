package types

// Servers tools refresh result schema exposed by Claw Router.
type ServersToolsRefreshResult struct {
	Code string `json:"code"`
	Data AdminMcpDiscoveryResponse `json:"data"`
	Msg string `json:"msg"`
}
