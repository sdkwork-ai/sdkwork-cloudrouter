package types

// Dashboard overview retrieve result schema exposed by Claw Router.
type DashboardOverviewRetrieveResult struct {
	Code string `json:"code"`
	Data DashboardOverviewResponse `json:"data"`
	Msg string `json:"msg"`
}
