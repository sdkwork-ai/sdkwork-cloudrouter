package types

// Admin cache overview response schema exposed by Claw Router.
type AdminCacheOverviewResponse struct {
	Instances []AdminCacheInstance `json:"instances"`
	NamespacePolicies []AdminCacheNamespacePolicy `json:"namespacePolicies"`
	Summary AdminCacheSummary `json:"summary"`
}
