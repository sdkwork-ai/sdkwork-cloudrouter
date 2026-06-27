package types

// Admin site create request schema exposed by Claw Router.
type AdminSiteCreateRequest struct {
	BaseUrl string `json:"baseUrl"`
	CredentialRef string `json:"credentialRef"`
	Description string `json:"description"`
	DisplayName string `json:"displayName"`
	DocsUrl string `json:"docsUrl"`
	Domains []string `json:"domains"`
	Environment string `json:"environment"`
	Logo MediaResource `json:"logo"`
	MaskedLabel string `json:"maskedLabel"`
	OwnerKind string `json:"ownerKind"`
	RegionCode string `json:"regionCode"`
	SiteCode string `json:"siteCode"`
	SiteName string `json:"siteName"`
	SiteType string `json:"siteType"`
	Status string `json:"status"`
	VendorCodes []string `json:"vendorCodes"`
	WebsiteUrl string `json:"websiteUrl"`
}
