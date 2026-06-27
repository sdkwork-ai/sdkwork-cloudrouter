package types

// Storage default bucket mutation response schema exposed by Claw Router.
type StorageDefaultBucketMutationResponse struct {
	DefaultBucket StorageDefaultBucketConfig `json:"defaultBucket"`
	RequestId string `json:"requestId"`
}
