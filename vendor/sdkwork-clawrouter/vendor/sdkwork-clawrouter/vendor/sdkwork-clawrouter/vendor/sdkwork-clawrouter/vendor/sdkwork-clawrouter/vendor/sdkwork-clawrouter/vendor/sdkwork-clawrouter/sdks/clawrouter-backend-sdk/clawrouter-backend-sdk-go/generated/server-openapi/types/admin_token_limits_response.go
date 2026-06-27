package types

// Admin token limits response schema exposed by Claw Router.
type AdminTokenLimitsResponse struct {
	Items []AdminRateLimitItem `json:"items"`
}
