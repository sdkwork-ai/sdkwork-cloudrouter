package types

// Admin site settings response schema exposed by Claw Router.
type AdminSiteSettingsResponse struct {
	AccentColor string `json:"accentColor"`
	BrandColor string `json:"brandColor"`
	CustomCss string `json:"customCss"`
	Description string `json:"description"`
	DocsUrl string `json:"docsUrl"`
	Favicon MediaResource `json:"favicon"`
	FooterCopyright string `json:"footerCopyright"`
	Icon MediaResource `json:"icon"`
	IcpRecordNumber string `json:"icpRecordNumber"`
	IcpRecordUrl string `json:"icpRecordUrl"`
	Logo MediaResource `json:"logo"`
	PoliceRecordNumber string `json:"policeRecordNumber"`
	PoliceRecordUrl string `json:"policeRecordUrl"`
	PrivacyUrl string `json:"privacyUrl"`
	SeoDescription string `json:"seoDescription"`
	SeoTitle string `json:"seoTitle"`
	ShortName string `json:"shortName"`
	SiteName string `json:"siteName"`
	SupportUrl string `json:"supportUrl"`
	TermsUrl string `json:"termsUrl"`
}
