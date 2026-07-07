package types

// Shops current shipping templates list result schema exposed by Claw Router.
type ShopsCurrentShippingTemplatesListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
