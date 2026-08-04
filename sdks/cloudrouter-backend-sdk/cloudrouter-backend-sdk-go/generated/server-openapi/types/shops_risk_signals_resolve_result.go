package types

// Shops risk signals resolve result schema exposed by Cloud Router.
type ShopsRiskSignalsResolveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
