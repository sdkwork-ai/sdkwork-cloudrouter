package types

// Invocations retrieve result schema exposed by Claw Router.
type InvocationsRetrieveResult struct {
	Code string `json:"code"`
	Data RuntimeInvocationItem `json:"data"`
	Msg string `json:"msg"`
}
