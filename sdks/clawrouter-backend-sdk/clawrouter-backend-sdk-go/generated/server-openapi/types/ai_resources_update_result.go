package types

// Ai resources update result schema exposed by Claw Router.
type AiResourcesUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
