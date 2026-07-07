package types

// Admin analytics overview schema exposed by Claw Router.
type AdminAnalyticsOverview struct {
	EndTime string `json:"endTime"`
	Insights []map[string]interface{} `json:"insights"`
	ModalityDistribution []map[string]interface{} `json:"modalityDistribution"`
	ModelDistribution []map[string]interface{} `json:"modelDistribution"`
	ModelRankings map[string]interface{} `json:"modelRankings"`
	RankingSize int `json:"rankingSize"`
	StartTime string `json:"startTime"`
	Summary map[string]interface{} `json:"summary"`
	TimeRange string `json:"timeRange"`
	Trend []map[string]interface{} `json:"trend"`
	UserRankings map[string]interface{} `json:"userRankings"`
}
