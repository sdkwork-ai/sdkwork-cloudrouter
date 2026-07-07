package types

// Shops verifications update result schema exposed by Claw Router.
type ShopsVerificationsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
