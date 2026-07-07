package types

// Cache overview schema exposed by Claw Router.
type CacheOverview struct {
	Instances []map[string]interface{} `json:"instances"`
	NamespacePolicies []map[string]interface{} `json:"namespacePolicies"`
	Summary map[string]interface{} `json:"summary"`
}
