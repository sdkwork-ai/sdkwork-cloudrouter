package types

// Storage provider health check response schema exposed by Claw Router.
type StorageProviderHealthCheckResponse struct {
	CheckedAt string `json:"checkedAt"`
	Healthy bool `json:"healthy"`
	ProviderId string `json:"providerId"`
	RequestId string `json:"requestId"`
	Status string `json:"status"`
}
