package types

// Storage default bucket list response schema exposed by Claw Router.
type StorageDefaultBucketListResponse struct {
	Items []StorageDefaultBucketConfig `json:"items"`
	RequestId string `json:"requestId"`
}
