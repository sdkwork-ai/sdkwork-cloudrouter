package types

// Shops risk signals create result schema exposed by Claw Router.
type ShopsRiskSignalsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
