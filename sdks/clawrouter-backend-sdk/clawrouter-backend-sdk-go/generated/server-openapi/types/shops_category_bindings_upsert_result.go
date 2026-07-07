package types

// Shops category bindings upsert result schema exposed by Claw Router.
type ShopsCategoryBindingsUpsertResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
