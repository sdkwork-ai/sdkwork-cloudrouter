package types

// Shops settlement profile approve result schema exposed by Claw Router.
type ShopsSettlementProfileApproveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
