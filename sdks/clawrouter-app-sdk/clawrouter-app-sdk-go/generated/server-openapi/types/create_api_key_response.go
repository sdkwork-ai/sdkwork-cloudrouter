package types

// Create api key response schema exposed by Claw Router.
type CreateApiKeyResponse struct {
	Item AppApiKeyItem `json:"item"`
	RawKey string `json:"rawKey"`
}
