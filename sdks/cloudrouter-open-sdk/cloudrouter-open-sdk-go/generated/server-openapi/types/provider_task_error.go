package types

// Reusable provider provider task error schema shared by Cloud Router vendor modules.
type ProviderTaskError struct {
	Code string `json:"code"`
	Message string `json:"message"`
	Type string `json:"type"`
}
