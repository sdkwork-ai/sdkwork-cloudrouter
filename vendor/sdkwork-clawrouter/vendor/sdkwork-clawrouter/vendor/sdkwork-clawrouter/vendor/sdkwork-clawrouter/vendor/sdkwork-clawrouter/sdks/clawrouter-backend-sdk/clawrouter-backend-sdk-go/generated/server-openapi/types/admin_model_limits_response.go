package types

// Admin model limits response schema exposed by Claw Router.
type AdminModelLimitsResponse struct {
	Items []AdminRateLimitItem `json:"items"`
}
