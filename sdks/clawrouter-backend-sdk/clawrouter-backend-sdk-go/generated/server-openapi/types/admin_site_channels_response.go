package types

// Admin site channels response schema exposed by Claw Router.
type AdminSiteChannelsResponse struct {
	Items []AdminSiteChannelItem `json:"items"`
}
