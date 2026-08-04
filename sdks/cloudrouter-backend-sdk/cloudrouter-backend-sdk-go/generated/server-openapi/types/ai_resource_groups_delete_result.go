package types

// Ai resource groups delete result schema exposed by Cloud Router.
type AiResourceGroupsDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
