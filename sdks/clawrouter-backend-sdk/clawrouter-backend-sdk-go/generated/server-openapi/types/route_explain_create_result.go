package types

// Route explain create result schema exposed by Claw Router.
type RouteExplainCreateResult struct {
	Code string `json:"code"`
	Data AdminRuntimeRouteExplainResponse `json:"data"`
	Msg string `json:"msg"`
}
