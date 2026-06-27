package types

// Sender identities create result schema exposed by Claw Router.
type SenderIdentitiesCreateResult struct {
	Code string `json:"code"`
	Data MessagingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
