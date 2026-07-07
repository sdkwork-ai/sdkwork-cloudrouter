package types

// Dashboard overview retrieve result schema exposed by Claw Router.
type DashboardOverviewRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
