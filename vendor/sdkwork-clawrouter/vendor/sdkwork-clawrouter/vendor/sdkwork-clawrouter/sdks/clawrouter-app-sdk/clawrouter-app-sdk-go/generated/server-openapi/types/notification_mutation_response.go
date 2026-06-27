package types

// Notification mutation response schema exposed by Claw Router.
type NotificationMutationResponse struct {
	State string `json:"state"`
	Updated bool `json:"updated"`
}
