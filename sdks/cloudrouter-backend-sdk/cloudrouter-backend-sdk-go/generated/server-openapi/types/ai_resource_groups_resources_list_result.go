package types

// Ai resource groups resources list result schema exposed by Cloud Router.
type AiResourceGroupsResourcesListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
