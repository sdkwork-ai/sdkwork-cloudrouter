package types

// Shops current deposit account retrieve result schema exposed by Cloud Router.
type ShopsCurrentDepositAccountRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
