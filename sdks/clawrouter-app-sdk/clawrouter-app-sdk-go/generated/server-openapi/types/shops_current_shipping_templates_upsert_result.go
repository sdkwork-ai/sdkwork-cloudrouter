package types

// Shops current shipping templates upsert result schema exposed by Claw Router.
type ShopsCurrentShippingTemplatesUpsertResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
