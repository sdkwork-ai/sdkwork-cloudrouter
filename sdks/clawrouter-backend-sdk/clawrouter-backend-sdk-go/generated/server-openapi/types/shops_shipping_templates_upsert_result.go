package types

// Shops shipping templates upsert result schema exposed by Claw Router.
type ShopsShippingTemplatesUpsertResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
