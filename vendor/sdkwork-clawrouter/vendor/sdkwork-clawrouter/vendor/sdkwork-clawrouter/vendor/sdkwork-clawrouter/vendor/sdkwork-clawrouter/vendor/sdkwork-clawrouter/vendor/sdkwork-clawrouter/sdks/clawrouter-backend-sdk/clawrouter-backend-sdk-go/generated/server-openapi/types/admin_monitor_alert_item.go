package types

// Admin monitor alert item schema exposed by Claw Router.
type AdminMonitorAlertItem struct {
	Id string `json:"id"`
	Message string `json:"message"`
	Severity string `json:"severity"`
	Source string `json:"source"`
	Status string `json:"status"`
	Time string `json:"time"`
	Title string `json:"title"`
}
