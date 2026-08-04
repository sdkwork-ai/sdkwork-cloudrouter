package types

// Routing api keys list result schema exposed by Cloud Router.
type RoutingApiKeysListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
