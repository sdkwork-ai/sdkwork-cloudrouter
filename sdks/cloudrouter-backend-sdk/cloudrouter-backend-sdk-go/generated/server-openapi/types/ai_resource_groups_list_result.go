package types

// Ai resource groups list result schema exposed by Cloud Router.
type AiResourceGroupsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
