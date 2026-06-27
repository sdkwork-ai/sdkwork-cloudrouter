package types

// Diagnostics route simulation create result schema exposed by Claw Router.
type DiagnosticsRouteSimulationCreateResult struct {
	Code string `json:"code"`
	Data MessagingRouteSimulationResponse `json:"data"`
	Msg string `json:"msg"`
}
