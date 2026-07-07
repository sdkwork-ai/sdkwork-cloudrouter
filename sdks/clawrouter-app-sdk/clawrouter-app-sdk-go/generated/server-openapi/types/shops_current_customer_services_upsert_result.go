package types

// Shops current customer services upsert result schema exposed by Claw Router.
type ShopsCurrentCustomerServicesUpsertResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
