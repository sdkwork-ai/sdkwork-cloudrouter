package types

// Shops settlement profile reject result schema exposed by Claw Router.
type ShopsSettlementProfileRejectResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
