package types

// Storage usage snapshot list response schema exposed by Claw Router.
type StorageUsageSnapshotListResponse struct {
	Items []StorageUsageSnapshot `json:"items"`
	NextCursor string `json:"nextCursor"`
	RequestId string `json:"requestId"`
}
