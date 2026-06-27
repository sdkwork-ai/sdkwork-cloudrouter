package types

// Notifications acknowledge create result schema exposed by Claw Router.
type NotificationsAcknowledgeCreateResult struct {
	Code string `json:"code"`
	Data NotificationMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
