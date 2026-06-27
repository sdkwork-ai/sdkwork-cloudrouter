package types

// Set storage default bucket request schema exposed by Claw Router.
type SetStorageDefaultBucketRequest struct {
	BucketId string `json:"bucketId"`
	Reason string `json:"reason"`
}
