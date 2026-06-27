package types

// Model ranking refresh latest job schema exposed by Claw Router.
type ModelRankingRefreshLatestJob struct {
	DurationMs string `json:"durationMs"`
	EndedAt string `json:"endedAt"`
	FailureCount string `json:"failureCount"`
	FailureReason string `json:"failureReason"`
	GeneratedCount string `json:"generatedCount"`
	Id string `json:"id"`
	JobName string `json:"jobName"`
	NextRefreshAt string `json:"nextRefreshAt"`
	OrganizationId string `json:"organizationId"`
	RankScope string `json:"rankScope"`
	SnapshotDate string `json:"snapshotDate"`
	SnapshotPeriod string `json:"snapshotPeriod"`
	SourceCount string `json:"sourceCount"`
	StartedAt string `json:"startedAt"`
	Status string `json:"status"`
	SuccessCount string `json:"successCount"`
	TenantId string `json:"tenantId"`
	WindowEnd string `json:"windowEnd"`
	WindowStart string `json:"windowStart"`
}
