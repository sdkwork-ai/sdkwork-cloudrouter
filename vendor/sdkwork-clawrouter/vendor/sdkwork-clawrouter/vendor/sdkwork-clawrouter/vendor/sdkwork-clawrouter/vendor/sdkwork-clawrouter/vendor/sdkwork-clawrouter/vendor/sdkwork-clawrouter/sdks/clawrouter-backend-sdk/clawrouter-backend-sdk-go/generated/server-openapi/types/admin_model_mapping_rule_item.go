package types

// Admin model mapping rule item schema exposed by Claw Router.
type AdminModelMappingRuleItem struct {
	CreatedAt string `json:"createdAt"`
	Enabled bool `json:"enabled"`
	Id string `json:"id"`
	SortOrder string `json:"sortOrder"`
	SourceCatalogKey string `json:"sourceCatalogKey"`
	SourceModel string `json:"sourceModel"`
	TargetCatalogKey string `json:"targetCatalogKey"`
	TargetModel string `json:"targetModel"`
	TargetProviderModel string `json:"targetProviderModel"`
	TargetProviderNativeModel string `json:"targetProviderNativeModel"`
	UpdatedAt string `json:"updatedAt"`
}
