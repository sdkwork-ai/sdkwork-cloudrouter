package types

// Shops current brand authorizations list result schema exposed by Cloud Router.
type ShopsCurrentBrandAuthorizationsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
