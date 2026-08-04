package types

// Shops current status events list result schema exposed by Cloud Router.
type ShopsCurrentStatusEventsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
