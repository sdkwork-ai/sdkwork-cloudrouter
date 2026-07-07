package types

// Cache operation outcome schema exposed by Claw Router.
type CacheOperationOutcome struct {
	CacheKey string `json:"cacheKey"`
	DeletedEntries string `json:"deletedEntries"`
	InstanceName string `json:"instanceName"`
	Namespace string `json:"namespace"`
	Operation string `json:"operation"`
	RefreshedEntries string `json:"refreshedEntries"`
	Status string `json:"status"`
}
