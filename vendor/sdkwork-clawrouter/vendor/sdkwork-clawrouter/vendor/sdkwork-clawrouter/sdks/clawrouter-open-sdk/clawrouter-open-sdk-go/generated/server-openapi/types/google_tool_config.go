package types

// Google Gemini google tool config schema exposed by Claw Router vendor routing.
type GoogleToolConfig struct {
	FunctionCallingConfig GoogleFunctionCallingConfig `json:"functionCallingConfig"`
}
