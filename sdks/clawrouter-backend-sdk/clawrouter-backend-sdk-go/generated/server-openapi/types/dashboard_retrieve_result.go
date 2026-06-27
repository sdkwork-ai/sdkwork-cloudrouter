package types

// Dashboard retrieve result schema exposed by Claw Router.
type DashboardRetrieveResult struct {
	Code string `json:"code"`
	Data ServiceProviderDashboardResponse `json:"data"`
	Msg string `json:"msg"`
}
