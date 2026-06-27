package types

// Create storage reconciliation run request schema exposed by Claw Router.
type CreateStorageReconciliationRunRequest struct {
	BucketId string `json:"bucketId"`
	CheckMode string `json:"checkMode"`
	DryRun bool `json:"dryRun"`
	ProviderId string `json:"providerId"`
	Reason string `json:"reason"`
	RunType string `json:"runType"`
}
