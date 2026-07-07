package types

// Shops current business hours update result schema exposed by Claw Router.
type ShopsCurrentBusinessHoursUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
