package types

// Invocation events list result schema exposed by Claw Router.
type InvocationEventsListResult struct {
	Code string `json:"code"`
	Data RuntimeEventListResponse `json:"data"`
	Msg string `json:"msg"`
}
