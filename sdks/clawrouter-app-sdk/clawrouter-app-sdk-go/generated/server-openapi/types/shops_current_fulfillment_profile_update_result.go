package types

// Shops current fulfillment profile update result schema exposed by Claw Router.
type ShopsCurrentFulfillmentProfileUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
