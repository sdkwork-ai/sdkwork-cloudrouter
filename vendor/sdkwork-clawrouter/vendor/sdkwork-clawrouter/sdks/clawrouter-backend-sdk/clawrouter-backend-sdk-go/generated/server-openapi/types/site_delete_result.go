package types

// Site delete result schema exposed by Claw Router.
type SiteDeleteResult struct {
	Code string `json:"code"`
	Data AdminSiteDeleteResponse `json:"data"`
	Msg string `json:"msg"`
}
