package types

// Admin ai resource group resource item schema exposed by Claw Router.
type AdminAiResourceGroupResourceItem struct {
	ApiEndpointCode string `json:"apiEndpointCode"`
	CatalogKey string `json:"catalogKey"`
	DisplayName string `json:"displayName"`
	Id string `json:"id"`
	MemberRole string `json:"memberRole"`
	ModalityCode string `json:"modalityCode"`
	Model string `json:"model"`
	ProviderNativeModel string `json:"providerNativeModel"`
	ResourceCode string `json:"resourceCode"`
	ResourceType string `json:"resourceType"`
	SortOrder string `json:"sortOrder"`
	Status string `json:"status"`
	VendorCode string `json:"vendorCode"`
}
