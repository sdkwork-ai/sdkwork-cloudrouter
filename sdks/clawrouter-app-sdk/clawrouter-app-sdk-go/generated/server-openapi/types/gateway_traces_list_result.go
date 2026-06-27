package types

// Gateway traces list result schema exposed by Claw Router.
type GatewayTracesListResult struct {
	Code string `json:"code"`
	Data GatewayTracesResponse `json:"data"`
	Msg string `json:"msg"`
}
