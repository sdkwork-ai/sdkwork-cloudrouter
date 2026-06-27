package types

// OpenAI-compatible request to activate or deactivate certificates.
type OpenAiCertificateActivationRequest struct {
	CertificateIds []string `json:"certificate_ids"`
}
