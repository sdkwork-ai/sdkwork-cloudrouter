package types

// Admin ai resources response schema exposed by Claw Router.
type AdminAiResourcesResponse struct {
	Items []AdminAiResourceItem `json:"items"`
}
