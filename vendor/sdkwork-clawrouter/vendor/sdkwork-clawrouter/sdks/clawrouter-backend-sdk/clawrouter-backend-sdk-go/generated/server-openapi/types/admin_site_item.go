package types

// Admin site item schema exposed by Claw Router.
type AdminSiteItem struct {
	BaseUrl string `json:"baseUrl"`
	ConsecutiveErrorCount string `json:"consecutiveErrorCount"`
	Description string `json:"description"`
	DisplayName string `json:"displayName"`
	DocsUrl string `json:"docsUrl"`
	Domains []string `json:"domains"`
	Environment string `json:"environment"`
	HealthStatus string `json:"healthStatus"`
	Id string `json:"id"`
	LastCheckedAt string `json:"lastCheckedAt"`
	LastLatencyMs string `json:"lastLatencyMs"`
	LastSyncAt string `json:"lastSyncAt"`
	Logo MediaResource `json:"logo"`
	OwnerKind string `json:"ownerKind"`
	RegionCode string `json:"regionCode"`
	SiteCode string `json:"siteCode"`
	SiteName string `json:"siteName"`
	SiteType string `json:"siteType"`
	SortOrder string `json:"sortOrder"`
	Status string `json:"status"`
	VendorCodes []string `json:"vendorCodes"`
	WebsiteUrl string `json:"websiteUrl"`
}
