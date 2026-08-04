package types

// Shops fulfillment profile update result schema exposed by Cloud Router.
type ShopsFulfillmentProfileUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
