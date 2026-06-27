package types

// Admin analytics model rank item schema exposed by Claw Router.
type AdminAnalyticsModelRankItem struct {
	AverageTokensPerRequest float64 `json:"averageTokensPerRequest"`
	CatalogKey string `json:"catalogKey"`
	ErrorRate float64 `json:"errorRate"`
	Modality string `json:"modality"`
	Model string `json:"model"`
	Points float64 `json:"points"`
	Rank string `json:"rank"`
	RequestCount string `json:"requestCount"`
	TotalTokens float64 `json:"totalTokens"`
	UpstreamCost float64 `json:"upstreamCost"`
	UserCount string `json:"userCount"`
	Vendor string `json:"vendor"`
}
