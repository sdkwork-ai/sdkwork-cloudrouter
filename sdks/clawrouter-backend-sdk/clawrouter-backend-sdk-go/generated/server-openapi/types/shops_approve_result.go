package types

// Shops approve result schema exposed by Claw Router.
type ShopsApproveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
