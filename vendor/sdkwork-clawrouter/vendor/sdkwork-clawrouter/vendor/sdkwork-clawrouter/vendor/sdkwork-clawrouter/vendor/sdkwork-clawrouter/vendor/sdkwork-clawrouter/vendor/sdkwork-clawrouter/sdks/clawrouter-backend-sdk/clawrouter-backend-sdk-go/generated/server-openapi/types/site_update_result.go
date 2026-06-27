package types

// Site update result schema exposed by Claw Router.
type SiteUpdateResult struct {
	Code string `json:"code"`
	Data AdminSiteMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
