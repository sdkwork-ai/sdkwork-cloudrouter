package types

// Shops current risk signals list result schema exposed by Claw Router.
type ShopsCurrentRiskSignalsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
