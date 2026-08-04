package types

// Google Gemini google tool config schema exposed by Cloud Router vendor routing.
type GoogleToolConfig struct {
	FunctionCallingConfig GoogleFunctionCallingConfig `json:"functionCallingConfig"`
}
