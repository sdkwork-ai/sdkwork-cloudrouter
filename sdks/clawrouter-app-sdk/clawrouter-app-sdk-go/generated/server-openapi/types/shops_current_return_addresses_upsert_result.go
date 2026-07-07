package types

// Shops current return addresses upsert result schema exposed by Claw Router.
type ShopsCurrentReturnAddressesUpsertResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
