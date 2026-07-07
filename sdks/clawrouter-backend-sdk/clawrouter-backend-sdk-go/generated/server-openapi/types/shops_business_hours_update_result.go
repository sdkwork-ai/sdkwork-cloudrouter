package types

// Shops business hours update result schema exposed by Claw Router.
type ShopsBusinessHoursUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
