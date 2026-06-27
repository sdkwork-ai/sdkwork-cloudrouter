package types

// Templates create result schema exposed by Claw Router.
type TemplatesCreateResult struct {
	Code string `json:"code"`
	Data MessagingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
