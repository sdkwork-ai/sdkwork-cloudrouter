package types

// After sales events list result schema exposed by Cloud Router.
type AfterSalesEventsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
