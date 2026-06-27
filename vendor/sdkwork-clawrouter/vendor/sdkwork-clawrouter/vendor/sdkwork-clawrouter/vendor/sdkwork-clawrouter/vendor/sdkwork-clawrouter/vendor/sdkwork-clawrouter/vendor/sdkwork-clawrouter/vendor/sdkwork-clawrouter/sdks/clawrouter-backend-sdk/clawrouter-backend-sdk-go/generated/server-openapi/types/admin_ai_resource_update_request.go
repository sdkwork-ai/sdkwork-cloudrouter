package types

// Admin ai resource update request schema exposed by Claw Router.
type AdminAiResourceUpdateRequest struct {
	ApiEndpointCode string `json:"apiEndpointCode"`
	CatalogKey string `json:"catalogKey"`
	CompositionMode string `json:"compositionMode"`
	DisplayName string `json:"displayName"`
	Members []AdminAiResourceMemberInput `json:"members"`
	ModalityCode string `json:"modalityCode"`
	Model string `json:"model"`
	ProviderNativeModel string `json:"providerNativeModel"`
	ResourceCode string `json:"resourceCode"`
	ResourceType string `json:"resourceType"`
	SortOrder string `json:"sortOrder"`
	Status string `json:"status"`
	VendorCode string `json:"vendorCode"`
}
