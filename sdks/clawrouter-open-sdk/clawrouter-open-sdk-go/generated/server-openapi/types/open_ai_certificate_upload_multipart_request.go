package types

// OpenAI-compatible multipart request to upload a certificate.
type OpenAiCertificateUploadMultipartRequest struct {
	Certificate string `json:"certificate"`
	File string `json:"file"`
	Metadata string `json:"metadata"`
	Name string `json:"name"`
}
