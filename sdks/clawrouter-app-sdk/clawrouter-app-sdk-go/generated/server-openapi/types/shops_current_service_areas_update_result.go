package types

// Shops current service areas update result schema exposed by Claw Router.
type ShopsCurrentServiceAreasUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
