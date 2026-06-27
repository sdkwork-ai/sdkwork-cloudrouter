package types

// Storage bucket config schema exposed by Claw Router.
type StorageBucketConfig struct {
	BlockPublicAccess bool `json:"blockPublicAccess"`
	BucketName string `json:"bucketName"`
	BucketRegion string `json:"bucketRegion"`
	CreatedAt string `json:"createdAt"`
	DefaultEncryptionMode string `json:"defaultEncryptionMode"`
	DefaultStorageClass string `json:"defaultStorageClass"`
	Encryption string `json:"encryption"`
	Id string `json:"id"`
	KmsKeyRef string `json:"kmsKeyRef"`
	LifecycleEnabled bool `json:"lifecycleEnabled"`
	LogicalScope string `json:"logicalScope"`
	ObjectKeyPrefix string `json:"objectKeyPrefix"`
	ObjectLockEnabled bool `json:"objectLockEnabled"`
	ProviderCode string `json:"providerCode"`
	ProviderId string `json:"providerId"`
	PublicAccessBlocked bool `json:"publicAccessBlocked"`
	Status string `json:"status"`
	StorageClass string `json:"storageClass"`
	UpdatedAt string `json:"updatedAt"`
	VersioningEnabled bool `json:"versioningEnabled"`
}
