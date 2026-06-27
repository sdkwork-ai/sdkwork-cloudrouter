package types

// Template sends create result schema exposed by Claw Router.
type TemplateSendsCreateResult struct {
	Code string `json:"code"`
	Data MessagingTemplateSendResponse `json:"data"`
	Msg string `json:"msg"`
}
