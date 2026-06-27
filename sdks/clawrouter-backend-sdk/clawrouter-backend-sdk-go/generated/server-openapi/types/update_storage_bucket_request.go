package types

// Update storage bucket request schema exposed by Claw Router.
type UpdateStorageBucketRequest struct {
	Reason string `json:"reason"`
	Status string `json:"status"`
}
