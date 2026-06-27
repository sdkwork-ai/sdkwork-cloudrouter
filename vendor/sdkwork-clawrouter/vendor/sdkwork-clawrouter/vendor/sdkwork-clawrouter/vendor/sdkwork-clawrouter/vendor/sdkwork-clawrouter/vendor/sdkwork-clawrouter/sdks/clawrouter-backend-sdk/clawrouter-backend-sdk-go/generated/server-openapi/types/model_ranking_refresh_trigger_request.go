package types

// Model ranking refresh trigger request schema exposed by Claw Router.
type ModelRankingRefreshTriggerRequest struct {
	CacheMaxAgeSeconds string `json:"cacheMaxAgeSeconds"`
	Limit string `json:"limit"`
	LookbackDays string `json:"lookbackDays"`
	RankScope string `json:"rankScope"`
	RefreshIntervalSeconds string `json:"refreshIntervalSeconds"`
	SnapshotPeriod string `json:"snapshotPeriod"`
}
