package types

// Routing channels list result schema exposed by Claw Router.
type RoutingChannelsListResult struct {
	Code string `json:"code"`
	Data RoutingChannelsResponse `json:"data"`
	Msg string `json:"msg"`
}
