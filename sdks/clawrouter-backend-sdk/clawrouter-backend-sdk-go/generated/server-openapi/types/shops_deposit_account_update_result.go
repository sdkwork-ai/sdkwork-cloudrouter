package types

// Shops deposit account update result schema exposed by Claw Router.
type ShopsDepositAccountUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
