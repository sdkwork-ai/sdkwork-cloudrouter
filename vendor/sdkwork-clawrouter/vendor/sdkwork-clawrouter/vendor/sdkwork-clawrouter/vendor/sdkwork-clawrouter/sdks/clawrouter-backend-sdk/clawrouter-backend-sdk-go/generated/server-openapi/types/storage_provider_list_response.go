package types

// Storage provider list response schema exposed by Claw Router.
type StorageProviderListResponse struct {
	Items []StorageProviderConfig `json:"items"`
	RequestId string `json:"requestId"`
}
