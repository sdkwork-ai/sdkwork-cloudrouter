package types

// Service nodes update result schema exposed by Cloud Router.
type ServiceNodesUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
