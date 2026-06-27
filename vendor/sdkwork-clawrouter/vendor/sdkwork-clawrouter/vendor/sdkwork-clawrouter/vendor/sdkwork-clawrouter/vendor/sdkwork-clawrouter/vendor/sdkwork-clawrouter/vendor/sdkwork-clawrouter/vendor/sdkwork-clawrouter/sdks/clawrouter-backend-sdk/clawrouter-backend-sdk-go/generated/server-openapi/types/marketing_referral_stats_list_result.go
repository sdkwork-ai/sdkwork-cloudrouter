package types

// Marketing referral stats list result schema exposed by Claw Router.
type MarketingReferralStatsListResult struct {
	Code string `json:"code"`
	Data AdminReferralStatsResponse `json:"data"`
	Msg string `json:"msg"`
}
