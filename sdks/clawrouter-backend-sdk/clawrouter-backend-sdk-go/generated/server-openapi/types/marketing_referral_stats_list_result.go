package types

// Marketing referral stats list result schema exposed by Claw Router.
type MarketingReferralStatsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
