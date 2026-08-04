package types

// Shops current applications list result schema exposed by Cloud Router.
type ShopsCurrentApplicationsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
