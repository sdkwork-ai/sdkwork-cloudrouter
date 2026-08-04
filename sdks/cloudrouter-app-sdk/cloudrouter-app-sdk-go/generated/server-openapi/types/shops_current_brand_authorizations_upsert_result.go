package types

// Shops current brand authorizations upsert result schema exposed by Cloud Router.
type ShopsCurrentBrandAuthorizationsUpsertResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
