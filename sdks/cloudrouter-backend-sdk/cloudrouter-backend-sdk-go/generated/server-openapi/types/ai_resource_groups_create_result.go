package types

// Ai resource groups create result schema exposed by Cloud Router.
type AiResourceGroupsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
