package types

// Admin analytics model rankings schema exposed by Claw Router.
type AdminAnalyticsModelRankings struct {
	Points []AdminAnalyticsModelRankItem `json:"points"`
	Requests []AdminAnalyticsModelRankItem `json:"requests"`
	Tokens []AdminAnalyticsModelRankItem `json:"tokens"`
}
