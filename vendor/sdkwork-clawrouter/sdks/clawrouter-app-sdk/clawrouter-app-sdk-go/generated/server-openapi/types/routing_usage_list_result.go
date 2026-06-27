package types

// Routing usage list result schema exposed by Claw Router.
type RoutingUsageListResult struct {
	Code string `json:"code"`
	Data RoutingUsageSnapshot `json:"data"`
	Msg string `json:"msg"`
}
