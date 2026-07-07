package types

// Shops channels create result schema exposed by Claw Router.
type ShopsChannelsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
