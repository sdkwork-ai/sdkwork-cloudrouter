package types

// Installation status response schema exposed by Claw Router.
type InstallationStatusResponse struct {
	CatalogSource string `json:"catalogSource"`
	CatalogVersion string `json:"catalogVersion"`
	Changed bool `json:"changed"`
	Environment string `json:"environment"`
	ExternalCatalog bool `json:"externalCatalog"`
	LastCatalogRefreshStatus string `json:"lastCatalogRefreshStatus"`
	SchemaVersion string `json:"schemaVersion"`
	SeedProfile string `json:"seedProfile"`
	Status string `json:"status"`
}
