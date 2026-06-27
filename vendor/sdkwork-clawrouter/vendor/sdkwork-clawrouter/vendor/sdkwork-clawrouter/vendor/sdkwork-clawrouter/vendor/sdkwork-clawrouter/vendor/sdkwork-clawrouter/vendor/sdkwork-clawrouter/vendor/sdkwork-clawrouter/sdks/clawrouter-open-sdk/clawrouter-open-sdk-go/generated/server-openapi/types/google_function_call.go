package types

// Google Gemini google function call schema exposed by Claw Router vendor routing.
type GoogleFunctionCall struct {
	Args ProviderJsonObject `json:"args"`
	Name string `json:"name"`
}
