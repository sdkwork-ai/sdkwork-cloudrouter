package types

// Admin model catalog sync response schema exposed by Claw Router.
type AdminModelCatalogSyncResponse struct {
	AcceptedCount string `json:"acceptedCount"`
	CapabilityCount string `json:"capabilityCount"`
	CatalogRoot string `json:"catalogRoot"`
	CatalogVersion string `json:"catalogVersion"`
	DryRun bool `json:"dryRun"`
	FamilyCount string `json:"familyCount"`
	MeterCount string `json:"meterCount"`
	Mode string `json:"mode"`
	ModelCount string `json:"modelCount"`
	Models []AdminAiModelItem `json:"models"`
	PriceCount string `json:"priceCount"`
	RankingCount string `json:"rankingCount"`
	RequestedCatalogVersion string `json:"requestedCatalogVersion"`
	SnapshotId string `json:"snapshotId"`
	Source string `json:"source"`
	SourceHash string `json:"sourceHash"`
	SyncRunId string `json:"syncRunId"`
	Synced bool `json:"synced"`
	VendorCodes []string `json:"vendorCodes"`
	VendorCount string `json:"vendorCount"`
	Vendors []AdminModelVendorItem `json:"vendors"`
}
