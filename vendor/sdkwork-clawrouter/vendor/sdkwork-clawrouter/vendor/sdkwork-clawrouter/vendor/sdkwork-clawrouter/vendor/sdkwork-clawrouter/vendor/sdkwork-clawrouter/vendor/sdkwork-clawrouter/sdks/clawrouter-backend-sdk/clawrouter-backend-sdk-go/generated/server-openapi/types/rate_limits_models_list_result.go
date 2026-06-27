package types

// Rate limits models list result schema exposed by Claw Router.
type RateLimitsModelsListResult struct {
	Code string `json:"code"`
	Data AdminModelLimitsResponse `json:"data"`
	Msg string `json:"msg"`
}
