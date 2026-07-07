package types

// Routing api keys list result schema exposed by Claw Router.
type RoutingApiKeysListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
