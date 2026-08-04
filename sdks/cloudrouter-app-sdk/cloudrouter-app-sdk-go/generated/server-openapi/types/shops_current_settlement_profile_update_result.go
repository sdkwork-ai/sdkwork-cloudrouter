package types

// Shops current settlement profile update result schema exposed by Cloud Router.
type ShopsCurrentSettlementProfileUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
