package types

// Monitor nodes list result schema exposed by Claw Router.
type MonitorNodesListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
