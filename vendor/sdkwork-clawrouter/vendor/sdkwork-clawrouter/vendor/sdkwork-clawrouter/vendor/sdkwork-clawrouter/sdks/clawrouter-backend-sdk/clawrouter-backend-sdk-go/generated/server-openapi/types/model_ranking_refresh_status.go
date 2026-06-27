package types

// Model ranking refresh status schema exposed by Claw Router.
type ModelRankingRefreshStatus struct {
	CacheMaxAgeSeconds string `json:"cacheMaxAgeSeconds"`
	GeneratedAt string `json:"generatedAt"`
	GeneratedCount string `json:"generatedCount"`
	LatestJob ModelRankingRefreshLatestJob `json:"latestJob"`
	NextRefreshAt string `json:"nextRefreshAt"`
	OrganizationId string `json:"organizationId"`
	RankScope string `json:"rankScope"`
	RefreshIntervalSeconds string `json:"refreshIntervalSeconds"`
	SnapshotDate string `json:"snapshotDate"`
	SnapshotPeriod string `json:"snapshotPeriod"`
	SourceCount string `json:"sourceCount"`
	SourceTables []string `json:"sourceTables"`
	Status string `json:"status"`
	TenantId string `json:"tenantId"`
	WindowEnd string `json:"windowEnd"`
	WindowStart string `json:"windowStart"`
}
