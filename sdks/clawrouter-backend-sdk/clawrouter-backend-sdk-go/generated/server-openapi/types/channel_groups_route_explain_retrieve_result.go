package types

// Channel groups route explain retrieve result schema exposed by Claw Router.
type ChannelGroupsRouteExplainRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
