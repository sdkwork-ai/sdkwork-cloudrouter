package types

// Admin analytics user rankings schema exposed by Claw Router.
type AdminAnalyticsUserRankings struct {
	Points []AdminAnalyticsUserRankItem `json:"points"`
	Requests []AdminAnalyticsUserRankItem `json:"requests"`
	Tokens []AdminAnalyticsUserRankItem `json:"tokens"`
}
