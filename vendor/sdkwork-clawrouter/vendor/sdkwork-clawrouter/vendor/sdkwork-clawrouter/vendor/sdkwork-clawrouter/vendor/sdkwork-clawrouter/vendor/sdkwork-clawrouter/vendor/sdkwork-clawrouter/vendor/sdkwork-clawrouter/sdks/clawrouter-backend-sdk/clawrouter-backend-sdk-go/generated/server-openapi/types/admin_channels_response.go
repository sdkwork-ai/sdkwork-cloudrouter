package types

// Admin channels response schema exposed by Claw Router.
type AdminChannelsResponse struct {
	Items []AdminChannelItem `json:"items"`
}
