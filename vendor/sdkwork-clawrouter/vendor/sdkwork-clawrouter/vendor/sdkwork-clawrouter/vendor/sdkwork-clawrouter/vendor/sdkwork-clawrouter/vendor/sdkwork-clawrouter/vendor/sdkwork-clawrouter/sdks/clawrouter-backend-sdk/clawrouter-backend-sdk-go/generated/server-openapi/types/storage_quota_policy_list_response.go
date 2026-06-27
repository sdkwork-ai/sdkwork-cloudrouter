package types

// Storage quota policy list response schema exposed by Claw Router.
type StorageQuotaPolicyListResponse struct {
	Items []StorageQuotaPolicy `json:"items"`
	RequestId string `json:"requestId"`
}
