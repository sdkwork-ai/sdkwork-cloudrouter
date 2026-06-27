package types

// Site create result schema exposed by Claw Router.
type SiteCreateResult struct {
	Code string `json:"code"`
	Data AdminSiteMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
