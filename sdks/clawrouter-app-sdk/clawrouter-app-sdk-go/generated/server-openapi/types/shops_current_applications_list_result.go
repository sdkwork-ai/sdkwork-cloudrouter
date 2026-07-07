package types

// Shops current applications list result schema exposed by Claw Router.
type ShopsCurrentApplicationsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
