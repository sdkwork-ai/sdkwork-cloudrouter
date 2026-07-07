package types

// Service nodes create result schema exposed by Claw Router.
type ServiceNodesCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
