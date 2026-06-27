package types

// Admin monitor performance response schema exposed by Claw Router.
type AdminMonitorPerformanceResponse struct {
	Items []AdminMonitorPerformanceItem `json:"items"`
}
