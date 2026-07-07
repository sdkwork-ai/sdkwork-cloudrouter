package types

// Shops current customer services list result schema exposed by Claw Router.
type ShopsCurrentCustomerServicesListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
