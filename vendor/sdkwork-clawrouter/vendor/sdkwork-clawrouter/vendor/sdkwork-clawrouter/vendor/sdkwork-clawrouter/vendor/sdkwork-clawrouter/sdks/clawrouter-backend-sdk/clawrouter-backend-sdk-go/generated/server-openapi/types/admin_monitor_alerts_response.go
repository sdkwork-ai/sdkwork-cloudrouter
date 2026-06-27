package types

// Admin monitor alerts response schema exposed by Claw Router.
type AdminMonitorAlertsResponse struct {
	Items []AdminMonitorAlertItem `json:"items"`
}
