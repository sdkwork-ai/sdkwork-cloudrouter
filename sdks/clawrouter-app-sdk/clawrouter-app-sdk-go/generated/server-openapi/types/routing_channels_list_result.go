package types

// Routing channels list result schema exposed by Claw Router.
type RoutingChannelsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
