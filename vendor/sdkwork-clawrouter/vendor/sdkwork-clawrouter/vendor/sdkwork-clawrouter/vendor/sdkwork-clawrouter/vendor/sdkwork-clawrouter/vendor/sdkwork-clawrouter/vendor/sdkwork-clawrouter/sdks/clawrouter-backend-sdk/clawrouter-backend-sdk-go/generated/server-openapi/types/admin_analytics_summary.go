package types

// Admin analytics summary schema exposed by Claw Router.
type AdminAnalyticsSummary struct {
	ActiveModels string `json:"activeModels"`
	ActiveUsers string `json:"activeUsers"`
	AveragePointsPerRequest float64 `json:"averagePointsPerRequest"`
	AverageTokensPerRequest float64 `json:"averageTokensPerRequest"`
	ErrorRate float64 `json:"errorRate"`
	FailedRequests string `json:"failedRequests"`
	SuccessfulRequests string `json:"successfulRequests"`
	TotalPoints float64 `json:"totalPoints"`
	TotalRequests string `json:"totalRequests"`
	TotalTokens float64 `json:"totalTokens"`
	TotalUsers string `json:"totalUsers"`
	UpstreamCost float64 `json:"upstreamCost"`
}
