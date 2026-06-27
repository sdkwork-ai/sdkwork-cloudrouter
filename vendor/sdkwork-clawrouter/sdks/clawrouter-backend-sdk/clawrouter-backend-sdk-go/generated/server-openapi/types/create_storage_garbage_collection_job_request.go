package types

// Create storage garbage collection job request schema exposed by Claw Router.
type CreateStorageGarbageCollectionJobRequest struct {
	Criteria map[string]JsonValue `json:"criteria"`
	DryRun bool `json:"dryRun"`
	DryRunSample string `json:"dryRunSample"`
	JobType string `json:"jobType"`
	RetentionWindow string `json:"retentionWindow"`
	Target string `json:"target"`
}
