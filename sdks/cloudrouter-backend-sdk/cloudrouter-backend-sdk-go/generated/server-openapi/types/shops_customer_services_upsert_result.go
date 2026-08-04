package types

// Shops customer services upsert result schema exposed by Cloud Router.
type ShopsCustomerServicesUpsertResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
