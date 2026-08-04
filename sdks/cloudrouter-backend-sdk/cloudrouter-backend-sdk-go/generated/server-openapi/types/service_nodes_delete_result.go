package types

// Service nodes delete result schema exposed by Cloud Router.
type ServiceNodesDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
