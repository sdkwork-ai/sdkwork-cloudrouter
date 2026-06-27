package types

// Admin model mapping rule item input schema exposed by Claw Router.
type AdminModelMappingRuleItemInput struct {
	Enabled bool `json:"enabled"`
	Id string `json:"id"`
	SourceCatalogKey string `json:"sourceCatalogKey"`
	SourceModel string `json:"sourceModel"`
	TargetCatalogKey string `json:"targetCatalogKey"`
	TargetModel string `json:"targetModel"`
	TargetProviderModel string `json:"targetProviderModel"`
	TargetProviderNativeModel string `json:"targetProviderNativeModel"`
}
