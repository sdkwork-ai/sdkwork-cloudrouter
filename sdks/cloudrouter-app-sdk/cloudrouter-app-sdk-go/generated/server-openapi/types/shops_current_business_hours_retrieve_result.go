package types

// Shops current business hours retrieve result schema exposed by Cloud Router.
type ShopsCurrentBusinessHoursRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
