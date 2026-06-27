package types

// Update settings request schema exposed by Claw Router.
type UpdateSettingsRequest struct {
	Language string `json:"language"`
	Notifications SettingsNotifications `json:"notifications"`
	Timezone string `json:"timezone"`
	WebhookUrl string `json:"webhookUrl"`
}
