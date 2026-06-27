package types

// Update api key response schema exposed by Claw Router.
type UpdateApiKeyResponse struct {
	Item AppApiKeyItem `json:"item"`
}
