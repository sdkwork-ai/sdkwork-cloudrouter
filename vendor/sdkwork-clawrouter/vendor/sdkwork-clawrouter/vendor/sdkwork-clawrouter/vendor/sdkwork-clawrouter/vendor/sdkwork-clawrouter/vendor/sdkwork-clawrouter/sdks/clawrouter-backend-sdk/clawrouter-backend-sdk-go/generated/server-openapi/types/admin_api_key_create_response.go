package types

// Admin api key create response schema exposed by Claw Router.
type AdminApiKeyCreateResponse struct {
	Key AdminApiKeyItem `json:"key"`
	RawKey string `json:"rawKey"`
}
