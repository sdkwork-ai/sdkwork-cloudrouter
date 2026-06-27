package types

// Rate limits api keys list result schema exposed by Claw Router.
type RateLimitsApiKeysListResult struct {
	Code string `json:"code"`
	Data AdminTokenLimitsResponse `json:"data"`
	Msg string `json:"msg"`
}
