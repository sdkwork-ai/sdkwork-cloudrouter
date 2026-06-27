package types

// Routing request traces response schema exposed by Claw Router.
type RoutingRequestTracesResponse struct {
	Items []RoutingRequestTraceItem `json:"items"`
}
