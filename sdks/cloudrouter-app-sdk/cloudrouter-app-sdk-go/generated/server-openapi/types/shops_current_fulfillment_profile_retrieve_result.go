package types

// Shops current fulfillment profile retrieve result schema exposed by Cloud Router.
type ShopsCurrentFulfillmentProfileRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
