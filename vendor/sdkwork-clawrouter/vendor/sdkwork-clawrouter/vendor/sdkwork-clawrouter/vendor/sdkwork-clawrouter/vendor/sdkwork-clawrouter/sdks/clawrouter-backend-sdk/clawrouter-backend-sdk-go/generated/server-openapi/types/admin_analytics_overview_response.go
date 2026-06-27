package types

// Admin analytics overview response schema exposed by Claw Router.
type AdminAnalyticsOverviewResponse struct {
	EndTime string `json:"endTime"`
	Insights []AdminAnalyticsInsight `json:"insights"`
	Limit string `json:"limit"`
	ModalityDistribution []AdminPieChartItem `json:"modalityDistribution"`
	ModelDistribution []AdminPieChartItem `json:"modelDistribution"`
	ModelRankings AdminAnalyticsModelRankings `json:"modelRankings"`
	StartTime string `json:"startTime"`
	Summary AdminAnalyticsSummary `json:"summary"`
	TimeRange string `json:"timeRange"`
	Trend []AdminAnalyticsTrendPoint `json:"trend"`
	UserRankings AdminAnalyticsUserRankings `json:"userRankings"`
}
