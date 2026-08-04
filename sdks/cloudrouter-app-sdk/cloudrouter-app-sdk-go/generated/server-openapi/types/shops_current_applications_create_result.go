package types

// Shops current applications create result schema exposed by Cloud Router.
type ShopsCurrentApplicationsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
