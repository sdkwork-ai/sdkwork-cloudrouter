package types

// Routing api keys response schema exposed by Claw Router.
type RoutingApiKeysResponse struct {
	Items []RoutingApiKeyItem `json:"items"`
}
