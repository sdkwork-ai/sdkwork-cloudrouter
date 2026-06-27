package types

// Reusable provider provider generated media schema shared by Claw Router vendor modules.
type ProviderGeneratedMedia struct {
	Duration float64 `json:"duration"`
	Height int `json:"height"`
	Id string `json:"id"`
	Metadata ProviderGeneratedMediaMetadata `json:"metadata"`
	MimeType string `json:"mime_type"`
	Uri string `json:"uri"`
	Url string `json:"url"`
	Width int `json:"width"`
}
