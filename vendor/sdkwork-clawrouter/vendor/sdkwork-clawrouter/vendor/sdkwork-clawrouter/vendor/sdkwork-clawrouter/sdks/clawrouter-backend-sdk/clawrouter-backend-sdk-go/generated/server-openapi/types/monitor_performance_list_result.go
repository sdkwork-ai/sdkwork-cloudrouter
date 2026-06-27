package types

// Monitor performance list result schema exposed by Claw Router.
type MonitorPerformanceListResult struct {
	Code string `json:"code"`
	Data AdminMonitorPerformanceResponse `json:"data"`
	Msg string `json:"msg"`
}
