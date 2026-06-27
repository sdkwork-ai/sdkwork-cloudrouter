package types

// Model ranking refresh trigger response schema exposed by Claw Router.
type ModelRankingRefreshTriggerResponse struct {
	CacheMaxAgeSeconds string `json:"cacheMaxAgeSeconds"`
	GeneratedCount string `json:"generatedCount"`
	NextRefreshAt string `json:"nextRefreshAt"`
	OrganizationId string `json:"organizationId"`
	RankScope string `json:"rankScope"`
	RefreshIntervalSeconds string `json:"refreshIntervalSeconds"`
	SnapshotDate string `json:"snapshotDate"`
	SnapshotPeriod string `json:"snapshotPeriod"`
	SourceCount string `json:"sourceCount"`
	Status string `json:"status"`
	TenantId string `json:"tenantId"`
	Triggered bool `json:"triggered"`
	WindowEnd string `json:"windowEnd"`
	WindowStart string `json:"windowStart"`
}
