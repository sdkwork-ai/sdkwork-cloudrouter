package types

// Notification list response schema exposed by Claw Router.
type NotificationListResponse struct {
	Items []NotificationItem `json:"items"`
}
