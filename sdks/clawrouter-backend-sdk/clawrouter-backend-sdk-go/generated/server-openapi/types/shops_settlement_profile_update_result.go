package types

// Shops settlement profile update result schema exposed by Claw Router.
type ShopsSettlementProfileUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
