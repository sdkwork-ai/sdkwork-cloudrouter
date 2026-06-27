package types

// Storage usage counter list response schema exposed by Claw Router.
type StorageUsageCounterListResponse struct {
	Items []StorageUsageCounter `json:"items"`
	NextCursor string `json:"nextCursor"`
	RequestId string `json:"requestId"`
}
