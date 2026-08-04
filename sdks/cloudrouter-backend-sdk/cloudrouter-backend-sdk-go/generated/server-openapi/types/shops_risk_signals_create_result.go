package types

// Shops risk signals create result schema exposed by Cloud Router.
type ShopsRiskSignalsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
