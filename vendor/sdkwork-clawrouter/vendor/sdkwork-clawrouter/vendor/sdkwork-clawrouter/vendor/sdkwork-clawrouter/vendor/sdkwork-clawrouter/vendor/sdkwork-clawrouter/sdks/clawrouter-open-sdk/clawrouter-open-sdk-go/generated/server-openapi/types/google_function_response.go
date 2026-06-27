package types

// Google Gemini google function response schema exposed by Claw Router vendor routing.
type GoogleFunctionResponse struct {
	Name string `json:"name"`
	Response ProviderJsonObject `json:"response"`
}
