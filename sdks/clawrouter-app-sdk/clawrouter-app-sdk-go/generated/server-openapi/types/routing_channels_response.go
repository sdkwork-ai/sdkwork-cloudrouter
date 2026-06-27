package types

// Routing channels response schema exposed by Claw Router.
type RoutingChannelsResponse struct {
	Items []RoutingChannelItem `json:"items"`
}
