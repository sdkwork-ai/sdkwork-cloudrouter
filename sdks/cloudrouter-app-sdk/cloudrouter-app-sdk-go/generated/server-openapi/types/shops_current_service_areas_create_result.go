package types

// Shops current service areas create result schema exposed by Cloud Router.
type ShopsCurrentServiceAreasCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
