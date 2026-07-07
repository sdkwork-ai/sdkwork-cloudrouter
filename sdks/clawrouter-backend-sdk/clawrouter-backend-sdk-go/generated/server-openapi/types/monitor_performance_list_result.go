package types

// Monitor performance list result schema exposed by Claw Router.
type MonitorPerformanceListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
