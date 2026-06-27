package types

// Create storage provider request schema exposed by Claw Router.
type CreateStorageProviderRequest struct {
	CredentialRef string `json:"credentialRef"`
	Endpoint string `json:"endpoint"`
	EndpointUrl string `json:"endpointUrl"`
	Lifecycle bool `json:"lifecycle"`
	Multipart bool `json:"multipart"`
	ObjectLock bool `json:"objectLock"`
	PathStyleEnabled bool `json:"pathStyleEnabled"`
	ProviderCode string `json:"providerCode"`
	ProviderType string `json:"providerType"`
	Region string `json:"region"`
	SupportsLifecycle bool `json:"supportsLifecycle"`
	SupportsMultipart bool `json:"supportsMultipart"`
	SupportsObjectLock bool `json:"supportsObjectLock"`
}
