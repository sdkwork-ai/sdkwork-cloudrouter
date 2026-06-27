package types

// Admin rate limit mutation response schema exposed by Claw Router.
type AdminRateLimitMutationResponse struct {
	Item AdminRateLimitItem `json:"item"`
}
