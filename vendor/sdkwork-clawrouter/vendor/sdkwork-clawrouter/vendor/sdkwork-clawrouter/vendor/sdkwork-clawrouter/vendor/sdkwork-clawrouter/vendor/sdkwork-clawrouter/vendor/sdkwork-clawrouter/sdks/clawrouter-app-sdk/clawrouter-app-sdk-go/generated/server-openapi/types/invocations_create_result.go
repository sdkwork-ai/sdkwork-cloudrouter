package types

// Invocations create result schema exposed by Claw Router.
type InvocationsCreateResult struct {
	Code string `json:"code"`
	Data RuntimeInvocationResponse `json:"data"`
	Msg string `json:"msg"`
}
