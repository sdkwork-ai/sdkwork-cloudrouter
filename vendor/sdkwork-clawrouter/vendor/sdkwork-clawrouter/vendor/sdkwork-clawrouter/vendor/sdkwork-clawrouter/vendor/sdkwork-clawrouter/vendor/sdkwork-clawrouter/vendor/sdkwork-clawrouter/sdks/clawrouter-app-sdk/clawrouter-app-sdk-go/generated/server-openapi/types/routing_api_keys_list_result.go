package types

// Routing api keys list result schema exposed by Claw Router.
type RoutingApiKeysListResult struct {
	Code string `json:"code"`
	Data RoutingApiKeysResponse `json:"data"`
	Msg string `json:"msg"`
}
