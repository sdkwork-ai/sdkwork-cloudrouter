package types

// Messaging route simulation response schema exposed by Claw Router.
type MessagingRouteSimulationResponse struct {
	Matched bool `json:"matched"`
	RouteRuleId string `json:"routeRuleId"`
	Targets []map[string]JsonValue `json:"targets"`
}
