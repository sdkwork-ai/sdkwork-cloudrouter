package types

// Shops channels update result schema exposed by Claw Router.
type ShopsChannelsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
