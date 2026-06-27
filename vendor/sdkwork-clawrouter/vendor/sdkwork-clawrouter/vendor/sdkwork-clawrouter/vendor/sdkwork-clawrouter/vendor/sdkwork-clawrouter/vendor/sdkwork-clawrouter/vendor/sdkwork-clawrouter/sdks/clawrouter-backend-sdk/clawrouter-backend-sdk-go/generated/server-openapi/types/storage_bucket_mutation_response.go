package types

// Storage bucket mutation response schema exposed by Claw Router.
type StorageBucketMutationResponse struct {
	Bucket StorageBucketConfig `json:"bucket"`
	RequestId string `json:"requestId"`
}
