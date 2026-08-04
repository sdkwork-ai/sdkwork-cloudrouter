package types

// Shops current settlement profile retrieve result schema exposed by Cloud Router.
type ShopsCurrentSettlementProfileRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
