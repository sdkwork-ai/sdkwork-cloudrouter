package types

// Ai resource groups update result schema exposed by Claw Router.
type AiResourceGroupsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
