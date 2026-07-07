package types

// Shops service areas create result schema exposed by Claw Router.
type ShopsServiceAreasCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
