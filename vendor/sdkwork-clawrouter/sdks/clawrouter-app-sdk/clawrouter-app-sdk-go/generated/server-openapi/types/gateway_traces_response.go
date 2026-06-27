package types

// Gateway traces response schema exposed by Claw Router.
type GatewayTracesResponse struct {
	Items []GatewayTrace `json:"items"`
}
