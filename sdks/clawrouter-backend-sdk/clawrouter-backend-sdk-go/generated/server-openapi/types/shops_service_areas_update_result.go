package types

// Shops service areas update result schema exposed by Claw Router.
type ShopsServiceAreasUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
