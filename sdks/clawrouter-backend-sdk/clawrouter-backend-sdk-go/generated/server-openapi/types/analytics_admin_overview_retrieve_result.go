package types

// Analytics admin overview retrieve result schema exposed by Claw Router.
type AnalyticsAdminOverviewRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
