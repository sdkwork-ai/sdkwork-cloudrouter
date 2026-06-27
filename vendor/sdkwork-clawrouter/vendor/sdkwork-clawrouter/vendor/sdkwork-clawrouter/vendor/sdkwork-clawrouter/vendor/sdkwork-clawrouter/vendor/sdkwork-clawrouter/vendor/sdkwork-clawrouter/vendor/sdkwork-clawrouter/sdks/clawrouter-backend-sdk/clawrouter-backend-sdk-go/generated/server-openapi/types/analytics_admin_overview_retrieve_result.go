package types

// Analytics admin overview retrieve result schema exposed by Claw Router.
type AnalyticsAdminOverviewRetrieveResult struct {
	Code string `json:"code"`
	Data AdminAnalyticsOverviewResponse `json:"data"`
	Msg string `json:"msg"`
}
