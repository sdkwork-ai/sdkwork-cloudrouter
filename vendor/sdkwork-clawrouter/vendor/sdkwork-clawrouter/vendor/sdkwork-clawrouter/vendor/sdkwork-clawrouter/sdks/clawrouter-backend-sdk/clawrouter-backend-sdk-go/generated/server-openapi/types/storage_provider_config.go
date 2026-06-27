package types

// Storage provider config schema exposed by Claw Router.
type StorageProviderConfig struct {
	CreatedAt string `json:"createdAt"`
	CredentialRef string `json:"credentialRef"`
	Endpoint string `json:"endpoint"`
	EndpointUrl string `json:"endpointUrl"`
	Health string `json:"health"`
	HealthStatus string `json:"healthStatus"`
	Id string `json:"id"`
	LastHealthCheckAt string `json:"lastHealthCheckAt"`
	Lifecycle bool `json:"lifecycle"`
	Multipart bool `json:"multipart"`
	ObjectLock bool `json:"objectLock"`
	PathStyleEnabled bool `json:"pathStyleEnabled"`
	ProviderCode string `json:"providerCode"`
	ProviderType string `json:"providerType"`
	Region string `json:"region"`
	Status string `json:"status"`
	SupportsLifecycle bool `json:"supportsLifecycle"`
	SupportsMultipart bool `json:"supportsMultipart"`
	SupportsObjectLock bool `json:"supportsObjectLock"`
	UpdatedAt string `json:"updatedAt"`
}
