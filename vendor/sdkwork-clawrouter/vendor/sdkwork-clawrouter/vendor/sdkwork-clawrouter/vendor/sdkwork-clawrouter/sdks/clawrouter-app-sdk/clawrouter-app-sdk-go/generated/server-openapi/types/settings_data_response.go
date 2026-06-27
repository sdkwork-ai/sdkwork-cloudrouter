package types

// Settings data response schema exposed by Claw Router.
type SettingsDataResponse struct {
	Language string `json:"language"`
	Notifications SettingsNotifications `json:"notifications"`
	Timezone string `json:"timezone"`
	WebhookUrl string `json:"webhookUrl"`
}
