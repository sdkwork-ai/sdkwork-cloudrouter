package types

// Invocations list result schema exposed by Claw Router.
type InvocationsListResult struct {
	Code string `json:"code"`
	Data RuntimeInvocationListResponse `json:"data"`
	Msg string `json:"msg"`
}
