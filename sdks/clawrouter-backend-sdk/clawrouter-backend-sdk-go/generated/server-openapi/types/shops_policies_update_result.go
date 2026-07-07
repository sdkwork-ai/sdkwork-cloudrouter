package types

// Shops policies update result schema exposed by Claw Router.
type ShopsPoliciesUpdateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
