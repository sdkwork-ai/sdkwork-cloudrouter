package types

// Shops current category bindings upsert result schema exposed by Claw Router.
type ShopsCurrentCategoryBindingsUpsertResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
