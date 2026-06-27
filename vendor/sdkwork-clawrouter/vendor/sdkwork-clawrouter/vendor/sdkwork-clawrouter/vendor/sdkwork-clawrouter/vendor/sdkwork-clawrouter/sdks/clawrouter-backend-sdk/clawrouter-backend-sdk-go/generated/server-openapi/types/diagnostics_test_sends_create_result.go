package types

// Diagnostics test sends create result schema exposed by Claw Router.
type DiagnosticsTestSendsCreateResult struct {
	Code string `json:"code"`
	Data MessagingTestSendResponse `json:"data"`
	Msg string `json:"msg"`
}
