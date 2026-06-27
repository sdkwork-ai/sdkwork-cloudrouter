package types

// Route rules list result schema exposed by Claw Router.
type RouteRulesListResult struct {
	Code string `json:"code"`
	Data MessagingCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
