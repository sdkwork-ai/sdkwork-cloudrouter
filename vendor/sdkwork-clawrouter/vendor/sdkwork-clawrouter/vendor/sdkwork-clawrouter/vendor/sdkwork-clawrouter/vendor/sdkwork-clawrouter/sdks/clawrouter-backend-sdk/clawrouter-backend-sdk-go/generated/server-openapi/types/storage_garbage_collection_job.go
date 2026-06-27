package types

// Storage garbage collection job schema exposed by Claw Router.
type StorageGarbageCollectionJob struct {
	CandidateCount string `json:"candidateCount"`
	CreatedAt string `json:"createdAt"`
	DryRun bool `json:"dryRun"`
	Id string `json:"id"`
	JobId string `json:"jobId"`
	JobType string `json:"jobType"`
	Retention string `json:"retention"`
	Status string `json:"status"`
	Target string `json:"target"`
}
