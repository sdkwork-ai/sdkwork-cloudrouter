package types

// Invocation events create result schema exposed by Claw Router.
type InvocationEventsCreateResult struct {
	Code string `json:"code"`
	Data RuntimeEventResponse `json:"data"`
	Msg string `json:"msg"`
}
