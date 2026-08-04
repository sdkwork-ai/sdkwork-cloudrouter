package types

// Monitor nodes list result schema exposed by Cloud Router.
type MonitorNodesListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
