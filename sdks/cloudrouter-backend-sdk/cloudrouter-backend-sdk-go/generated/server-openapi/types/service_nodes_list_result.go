package types

// Service nodes list result schema exposed by Cloud Router.
type ServiceNodesListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
