package types

// Shops reject result schema exposed by Claw Router.
type ShopsRejectResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
