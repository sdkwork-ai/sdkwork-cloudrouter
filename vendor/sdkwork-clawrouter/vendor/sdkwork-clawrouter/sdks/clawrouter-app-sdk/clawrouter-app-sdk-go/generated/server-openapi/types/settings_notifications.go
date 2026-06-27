package types

// Settings notifications schema exposed by Claw Router.
type SettingsNotifications struct {
	ApiMonitor bool `json:"apiMonitor"`
	BillReminder bool `json:"billReminder"`
	QuotaWarning bool `json:"quotaWarning"`
}
