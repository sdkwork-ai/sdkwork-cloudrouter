package types

// Storage bucket list response schema exposed by Claw Router.
type StorageBucketListResponse struct {
	Items []StorageBucketConfig `json:"items"`
	NextCursor string `json:"nextCursor"`
	RequestId string `json:"requestId"`
}
