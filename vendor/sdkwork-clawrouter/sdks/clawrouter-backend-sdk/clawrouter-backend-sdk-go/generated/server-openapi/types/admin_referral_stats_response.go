package types

// Admin referral stats response schema exposed by Claw Router.
type AdminReferralStatsResponse struct {
	Items []AdminReferralStatItem `json:"items"`
}
