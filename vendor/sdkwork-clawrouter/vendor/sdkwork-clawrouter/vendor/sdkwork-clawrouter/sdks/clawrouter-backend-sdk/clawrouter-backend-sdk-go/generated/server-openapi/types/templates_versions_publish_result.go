package types

// Templates versions publish result schema exposed by Claw Router.
type TemplatesVersionsPublishResult struct {
	Code string `json:"code"`
	Data MessagingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
