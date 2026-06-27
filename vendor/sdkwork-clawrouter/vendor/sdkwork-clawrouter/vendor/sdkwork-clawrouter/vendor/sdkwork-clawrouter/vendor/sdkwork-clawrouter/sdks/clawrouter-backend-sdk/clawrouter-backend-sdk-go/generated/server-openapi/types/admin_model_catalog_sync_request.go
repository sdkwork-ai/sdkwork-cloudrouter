package types

// Admin model catalog sync request schema exposed by Claw Router.
type AdminModelCatalogSyncRequest struct {
	CatalogRoot string `json:"catalogRoot"`
	CatalogVersion string `json:"catalogVersion"`
	Force bool `json:"force"`
	Mode string `json:"mode"`
	Source string `json:"source"`
	VendorCodes []string `json:"vendorCodes"`
}
