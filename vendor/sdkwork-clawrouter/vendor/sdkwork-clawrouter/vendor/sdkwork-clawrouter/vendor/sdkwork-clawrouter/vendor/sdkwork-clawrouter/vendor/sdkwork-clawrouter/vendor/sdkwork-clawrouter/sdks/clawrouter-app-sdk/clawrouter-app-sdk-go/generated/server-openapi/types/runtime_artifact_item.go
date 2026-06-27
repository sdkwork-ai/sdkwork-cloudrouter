package types

// Runtime artifact item schema exposed by Claw Router.
type RuntimeArtifactItem struct {
	ArtifactType string `json:"artifactType"`
	ContentText string `json:"contentText"`
	CreatedAt string `json:"createdAt"`
	Id string `json:"id"`
	InvocationId string `json:"invocationId"`
	MimeType string `json:"mimeType"`
	Name string `json:"name"`
	Resource MediaResource `json:"resource"`
	Sha256 string `json:"sha256"`
	SizeBytes string `json:"sizeBytes"`
	StorageKey string `json:"storageKey"`
}
