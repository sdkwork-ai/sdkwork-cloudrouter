package types

// Suppressions create result schema exposed by Claw Router.
type SuppressionsCreateResult struct {
	Code string `json:"code"`
	Data MessagingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
