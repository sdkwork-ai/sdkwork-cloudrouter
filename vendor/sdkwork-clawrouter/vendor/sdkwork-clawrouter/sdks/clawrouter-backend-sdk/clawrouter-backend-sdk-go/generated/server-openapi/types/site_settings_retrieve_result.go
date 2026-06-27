package types

// Site settings retrieve result schema exposed by Claw Router.
type SiteSettingsRetrieveResult struct {
	Code string `json:"code"`
	Data AdminSiteSettingsResponse `json:"data"`
	Msg string `json:"msg"`
}
