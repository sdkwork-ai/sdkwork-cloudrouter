package types

// Dashboard admin overview retrieve result schema exposed by Claw Router.
type DashboardAdminOverviewRetrieveResult struct {
	Code string `json:"code"`
	Data AdminDashboardDataResponse `json:"data"`
	Msg string `json:"msg"`
}
