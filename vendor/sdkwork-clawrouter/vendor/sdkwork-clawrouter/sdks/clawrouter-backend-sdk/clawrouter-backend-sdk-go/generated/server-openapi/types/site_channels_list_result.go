package types

// Site channels list result schema exposed by Claw Router.
type SiteChannelsListResult struct {
	Code string `json:"code"`
	Data AdminSiteChannelsResponse `json:"data"`
	Msg string `json:"msg"`
}
