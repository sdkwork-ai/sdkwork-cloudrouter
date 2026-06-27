package types

// Runtime invocation list response schema exposed by Claw Router.
type RuntimeInvocationListResponse struct {
	Items []RuntimeInvocationItem `json:"items"`
}
