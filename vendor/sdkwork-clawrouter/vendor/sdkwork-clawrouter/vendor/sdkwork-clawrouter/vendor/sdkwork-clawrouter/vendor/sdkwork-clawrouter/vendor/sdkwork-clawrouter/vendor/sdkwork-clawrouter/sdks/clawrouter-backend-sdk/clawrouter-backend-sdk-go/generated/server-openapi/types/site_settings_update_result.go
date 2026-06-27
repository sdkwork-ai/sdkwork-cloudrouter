package types

// Site settings update result schema exposed by Claw Router.
type SiteSettingsUpdateResult struct {
	Code string `json:"code"`
	Data AdminSiteSettingsResponse `json:"data"`
	Msg string `json:"msg"`
}
