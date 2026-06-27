package types

// Admin runtime route explain issue schema exposed by Claw Router.
type AdminRuntimeRouteExplainIssue struct {
	Code string `json:"code"`
	Message string `json:"message"`
	Severity string `json:"severity"`
}
