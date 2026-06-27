package types

// Admin referral stat item schema exposed by Claw Router.
type AdminReferralStatItem struct {
	BonusAwarded string `json:"bonus_awarded"`
	Id string `json:"id"`
	Inviter string `json:"inviter"`
	Link string `json:"link"`
	TotalInvited string `json:"total_invited"`
	TotalRevenue string `json:"total_revenue"`
}
