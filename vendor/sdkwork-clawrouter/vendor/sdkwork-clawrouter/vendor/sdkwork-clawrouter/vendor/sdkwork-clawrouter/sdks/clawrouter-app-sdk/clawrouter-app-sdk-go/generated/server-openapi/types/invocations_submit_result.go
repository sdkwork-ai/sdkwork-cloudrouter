package types

// Invocations submit result schema exposed by Claw Router.
type InvocationsSubmitResult struct {
	Code string `json:"code"`
	Data RuntimeInvocationResponse `json:"data"`
	Msg string `json:"msg"`
}
