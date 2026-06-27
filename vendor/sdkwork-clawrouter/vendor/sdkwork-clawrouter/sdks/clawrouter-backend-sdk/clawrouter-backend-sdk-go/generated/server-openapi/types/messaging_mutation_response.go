package types

// Messaging mutation response schema exposed by Claw Router.
type MessagingMutationResponse struct {
	Id string `json:"id"`
	Status string `json:"status"`
}
