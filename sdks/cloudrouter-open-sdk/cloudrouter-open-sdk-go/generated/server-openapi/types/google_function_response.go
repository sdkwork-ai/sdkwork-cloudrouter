package types

// Google Gemini google function response schema exposed by Cloud Router vendor routing.
type GoogleFunctionResponse struct {
	Name string `json:"name"`
	Response ProviderJsonObject `json:"response"`
}
