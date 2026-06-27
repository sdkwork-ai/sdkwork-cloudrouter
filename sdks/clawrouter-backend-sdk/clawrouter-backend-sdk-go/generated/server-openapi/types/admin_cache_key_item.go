package types

// Admin cache key item schema exposed by Claw Router.
type AdminCacheKeyItem struct {
	ExpiresInSeconds string `json:"expiresInSeconds"`
	InstanceName string `json:"instanceName"`
	Key string `json:"key"`
	Namespace string `json:"namespace"`
	Status string `json:"status"`
}
