package types

// Gateway traces list result schema exposed by Claw Router.
type GatewayTracesListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
