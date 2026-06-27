package types

// Admin ip limits response schema exposed by Claw Router.
type AdminIpLimitsResponse struct {
	Items []AdminRateLimitItem `json:"items"`
}
