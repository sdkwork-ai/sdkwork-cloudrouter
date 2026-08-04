package types

// Shops current verifications list result schema exposed by Cloud Router.
type ShopsCurrentVerificationsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
