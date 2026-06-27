package types

// Sender identities list result schema exposed by Claw Router.
type SenderIdentitiesListResult struct {
	Code string `json:"code"`
	Data MessagingCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
