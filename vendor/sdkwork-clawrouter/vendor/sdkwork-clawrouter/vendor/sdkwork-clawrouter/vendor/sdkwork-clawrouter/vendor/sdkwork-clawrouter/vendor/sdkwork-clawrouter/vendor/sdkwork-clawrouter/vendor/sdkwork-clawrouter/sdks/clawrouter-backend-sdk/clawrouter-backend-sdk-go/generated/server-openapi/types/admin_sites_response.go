package types

// Admin sites response schema exposed by Claw Router.
type AdminSitesResponse struct {
	Items []AdminSiteItem `json:"items"`
}
