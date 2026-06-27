package types

// Notifications popup seen create result schema exposed by Claw Router.
type NotificationsPopupSeenCreateResult struct {
	Code string `json:"code"`
	Data NotificationMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
