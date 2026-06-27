package types

// Create storage bucket request schema exposed by Claw Router.
type CreateStorageBucketRequest struct {
	BlockPublicAccess bool `json:"blockPublicAccess"`
	BucketName string `json:"bucketName"`
	BucketRegion string `json:"bucketRegion"`
	DataResidencyRegion string `json:"dataResidencyRegion"`
	DefaultEncryptionMode string `json:"defaultEncryptionMode"`
	DefaultStorageClass string `json:"defaultStorageClass"`
	Encryption string `json:"encryption"`
	KmsKeyRef string `json:"kmsKeyRef"`
	LifecycleEnabled bool `json:"lifecycleEnabled"`
	LogicalScope string `json:"logicalScope"`
	ObjectKeyPrefix string `json:"objectKeyPrefix"`
	ObjectLockEnabled bool `json:"objectLockEnabled"`
	ProviderId string `json:"providerId"`
	PublicAccessBlocked bool `json:"publicAccessBlocked"`
	StorageClass string `json:"storageClass"`
	VersioningEnabled bool `json:"versioningEnabled"`
}
