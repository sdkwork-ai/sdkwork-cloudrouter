package types

// Admin channel group route explain issue schema exposed by Claw Router.
type AdminChannelGroupRouteExplainIssue struct {
	Code string `json:"code"`
	Details []string `json:"details"`
	Severity string `json:"severity"`
}
