package types

// Dashboard admin overview retrieve result schema exposed by Claw Router.
type DashboardAdminOverviewRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
