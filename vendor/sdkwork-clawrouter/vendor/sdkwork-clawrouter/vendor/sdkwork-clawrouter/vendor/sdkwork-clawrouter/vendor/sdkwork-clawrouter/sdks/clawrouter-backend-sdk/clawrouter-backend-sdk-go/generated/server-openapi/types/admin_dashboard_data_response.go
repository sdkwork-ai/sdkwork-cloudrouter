package types

// Admin dashboard data response schema exposed by Claw Router.
type AdminDashboardDataResponse struct {
	ActiveUsers string `json:"activeUsers"`
	ModelDistribution []AdminPieChartItem `json:"modelDistribution"`
	Multimodal []AdminPieChartItem `json:"multimodal"`
	RecentUsage []AdminDashboardRecentUsageItem `json:"recentUsage"`
	Traffic []AdminDashboardTrafficItem `json:"traffic"`
	UserConsumption []AdminPieChartItem `json:"userConsumption"`
}
