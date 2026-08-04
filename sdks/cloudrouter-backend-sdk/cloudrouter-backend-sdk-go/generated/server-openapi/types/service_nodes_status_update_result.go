package types

// Service nodes status update result schema exposed by Cloud Router.
type ServiceNodesStatusUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
