package types

// Persisted masked API key snapshot returned by the backend.
type AdminApiKeyItem struct {
	Id string `json:"id"`
	Key string `json:"key"`
	Name string `json:"name"`
	Status string `json:"status"`
	Used string `json:"used"`
}
