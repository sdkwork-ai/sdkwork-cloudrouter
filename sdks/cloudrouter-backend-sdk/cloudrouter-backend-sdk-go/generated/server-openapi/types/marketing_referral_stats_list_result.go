package types

// Marketing referral stats list result schema exposed by Cloud Router.
type MarketingReferralStatsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
