package types

// Invocation event streams list result schema exposed by Claw Router.
type InvocationEventStreamsListResult struct {
	Code string `json:"code"`
	Data RuntimeEventListResponse `json:"data"`
	Msg string `json:"msg"`
}
