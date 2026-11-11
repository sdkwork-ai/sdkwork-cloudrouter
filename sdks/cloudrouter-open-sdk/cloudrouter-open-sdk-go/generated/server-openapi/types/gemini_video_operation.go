package types

// Gemini video operation schema exposed by Cloud Router.
type GeminiVideoOperation struct {
	Done bool `json:"done"`
	Error map[string]ProviderJsonValue `json:"error"`
	Name string `json:"name"`
	Response map[string]ProviderJsonValue `json:"response"`
}
