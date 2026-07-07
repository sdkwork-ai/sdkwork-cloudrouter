package types

// Shops current channels update result schema exposed by Claw Router.
type ShopsCurrentChannelsUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
