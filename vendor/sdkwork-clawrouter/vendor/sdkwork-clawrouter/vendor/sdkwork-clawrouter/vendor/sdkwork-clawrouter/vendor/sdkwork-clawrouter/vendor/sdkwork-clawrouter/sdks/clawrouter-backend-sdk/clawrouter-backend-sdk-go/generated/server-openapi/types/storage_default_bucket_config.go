package types

// Storage default bucket config schema exposed by Claw Router.
type StorageDefaultBucketConfig struct {
	BucketId string `json:"bucketId"`
	BucketName string `json:"bucketName"`
	DataResidencyRegion string `json:"dataResidencyRegion"`
	Id string `json:"id"`
	LogicalScope string `json:"logicalScope"`
	ProviderCode string `json:"providerCode"`
	ProviderId string `json:"providerId"`
	ProviderType string `json:"providerType"`
	Reason string `json:"reason"`
	Region string `json:"region"`
	Status string `json:"status"`
	UpdatedAt string `json:"updatedAt"`
}
