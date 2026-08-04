package types

// Shops current return addresses list result schema exposed by Cloud Router.
type ShopsCurrentReturnAddressesListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
