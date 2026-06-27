package types

// Storage reconciliation run schema exposed by Claw Router.
type StorageReconciliationRun struct {
	BucketId string `json:"bucketId"`
	BucketName string `json:"bucketName"`
	DryRun bool `json:"dryRun"`
	FinishedAt string `json:"finishedAt"`
	Id string `json:"id"`
	IssueCount string `json:"issueCount"`
	Issues string `json:"issues"`
	ProviderCode string `json:"providerCode"`
	ProviderId string `json:"providerId"`
	RunId string `json:"runId"`
	RunType string `json:"runType"`
	Scope string `json:"scope"`
	StartedAt string `json:"startedAt"`
	Status string `json:"status"`
}
