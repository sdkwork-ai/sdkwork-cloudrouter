package types

// Shops brand authorizations upsert result schema exposed by Cloud Router.
type ShopsBrandAuthorizationsUpsertResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
