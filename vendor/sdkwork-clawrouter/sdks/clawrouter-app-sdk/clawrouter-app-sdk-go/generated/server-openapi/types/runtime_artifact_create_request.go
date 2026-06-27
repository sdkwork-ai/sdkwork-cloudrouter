package types

// Runtime artifact create request schema exposed by Claw Router.
type RuntimeArtifactCreateRequest struct {
	ArtifactType string `json:"artifactType"`
	ContentJson map[string]JsonValue `json:"contentJson"`
	ContentText string `json:"contentText"`
	Metadata map[string]JsonValue `json:"metadata"`
	MimeType string `json:"mimeType"`
	Name string `json:"name"`
	Resource MediaResource `json:"resource"`
	Sha256 string `json:"sha256"`
	SizeBytes string `json:"sizeBytes"`
	StorageKey string `json:"storageKey"`
}
