package types

// Shops current qualifications upsert result schema exposed by Cloud Router.
type ShopsCurrentQualificationsUpsertResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
