package types

// Site catalog list result schema exposed by Claw Router.
type SiteCatalogListResult struct {
	Code string `json:"code"`
	Data AdminSitesResponse `json:"data"`
	Msg string `json:"msg"`
}
