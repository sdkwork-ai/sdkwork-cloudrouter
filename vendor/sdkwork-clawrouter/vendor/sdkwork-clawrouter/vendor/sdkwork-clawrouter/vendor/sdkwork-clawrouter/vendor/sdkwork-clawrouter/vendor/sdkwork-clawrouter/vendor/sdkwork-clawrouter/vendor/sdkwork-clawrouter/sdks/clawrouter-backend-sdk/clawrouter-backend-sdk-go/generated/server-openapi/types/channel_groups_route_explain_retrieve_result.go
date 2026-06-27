package types

// Channel groups route explain retrieve result schema exposed by Claw Router.
type ChannelGroupsRouteExplainRetrieveResult struct {
	Code string `json:"code"`
	Data AdminChannelGroupRouteExplainResponse `json:"data"`
	Msg string `json:"msg"`
}
