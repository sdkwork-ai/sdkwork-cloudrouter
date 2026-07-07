package types

// Shops return addresses upsert result schema exposed by Claw Router.
type ShopsReturnAddressesUpsertResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
