package types

// One generated image, as a URL, a base64 payload, or a Files API output reference.
type XaiGeneratedImage struct {
	B64Json string `json:"b64_json"`
	FileOutput map[string]ProviderJsonValue `json:"file_output"`
	MimeType string `json:"mime_type"`
	StorageError string `json:"storage_error"`
	Url string `json:"url"`
}
