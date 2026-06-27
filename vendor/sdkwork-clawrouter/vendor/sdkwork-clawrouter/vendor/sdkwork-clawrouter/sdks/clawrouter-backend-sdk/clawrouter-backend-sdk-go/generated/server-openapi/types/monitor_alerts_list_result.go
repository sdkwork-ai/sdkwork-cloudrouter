package types

// Monitor alerts list result schema exposed by Claw Router.
type MonitorAlertsListResult struct {
	Code string `json:"code"`
	Data AdminMonitorAlertsResponse `json:"data"`
	Msg string `json:"msg"`
}
