package types

// Route rules create result schema exposed by Claw Router.
type RouteRulesCreateResult struct {
	Code string `json:"code"`
	Data MessagingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
