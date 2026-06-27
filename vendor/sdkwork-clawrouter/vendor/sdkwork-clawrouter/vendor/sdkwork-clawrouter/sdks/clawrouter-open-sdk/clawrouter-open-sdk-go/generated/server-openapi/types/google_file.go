package types

// Google Gemini google file schema exposed by Claw Router vendor routing.
type GoogleFile struct {
	CreateTime string `json:"createTime"`
	DisplayName string `json:"displayName"`
	Error ProviderTaskError `json:"error"`
	ExpirationTime string `json:"expirationTime"`
	MimeType string `json:"mimeType"`
	Name string `json:"name"`
	Sha256Hash string `json:"sha256Hash"`
	SizeBytes string `json:"sizeBytes"`
	State string `json:"state"`
	UpdateTime string `json:"updateTime"`
	Uri string `json:"uri"`
}
