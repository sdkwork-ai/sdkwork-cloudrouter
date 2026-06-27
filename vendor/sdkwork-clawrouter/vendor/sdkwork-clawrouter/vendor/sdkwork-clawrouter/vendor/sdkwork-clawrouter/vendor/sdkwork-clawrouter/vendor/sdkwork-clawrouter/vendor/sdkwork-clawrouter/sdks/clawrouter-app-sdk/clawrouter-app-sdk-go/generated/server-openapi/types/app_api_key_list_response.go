package types

// App api key list response schema exposed by Claw Router.
type AppApiKeyListResponse struct {
	Groups []AppChannelGroup `json:"groups"`
	Items []AppApiKeyItem `json:"items"`
}
