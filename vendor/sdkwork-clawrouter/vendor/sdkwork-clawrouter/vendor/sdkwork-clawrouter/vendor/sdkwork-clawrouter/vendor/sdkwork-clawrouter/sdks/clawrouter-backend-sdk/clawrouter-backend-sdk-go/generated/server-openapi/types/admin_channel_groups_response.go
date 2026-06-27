package types

// Admin channel groups response schema exposed by Claw Router.
type AdminChannelGroupsResponse struct {
	Items []AdminChannelGroupItem `json:"items"`
}
