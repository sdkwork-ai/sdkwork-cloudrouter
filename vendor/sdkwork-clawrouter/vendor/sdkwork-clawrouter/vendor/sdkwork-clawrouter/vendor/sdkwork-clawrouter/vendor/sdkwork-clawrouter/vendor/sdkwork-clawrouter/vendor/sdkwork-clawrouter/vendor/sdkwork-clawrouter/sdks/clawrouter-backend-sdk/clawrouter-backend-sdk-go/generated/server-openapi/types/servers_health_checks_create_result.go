package types

// Servers health checks create result schema exposed by Claw Router.
type ServersHealthChecksCreateResult struct {
	Code string `json:"code"`
	Data AdminMcpHealthCheckResponse `json:"data"`
	Msg string `json:"msg"`
}
