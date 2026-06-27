package types

// Health check create result schema exposed by Claw Router.
type HealthCheckCreateResult struct {
	Code string `json:"code"`
	Data AdminSiteConnectionCheckResponse `json:"data"`
	Msg string `json:"msg"`
}
