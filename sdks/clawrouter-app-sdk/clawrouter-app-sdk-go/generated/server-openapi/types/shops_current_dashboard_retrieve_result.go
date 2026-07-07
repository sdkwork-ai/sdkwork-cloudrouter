package types

// Shops current dashboard retrieve result schema exposed by Claw Router.
type ShopsCurrentDashboardRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
