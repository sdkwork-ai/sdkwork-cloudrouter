package types

// Google Gemini google function declaration schema exposed by Claw Router vendor routing.
type GoogleFunctionDeclaration struct {
	Description string `json:"description"`
	Name string `json:"name"`
	Parameters GoogleSchema `json:"parameters"`
	Response GoogleSchema `json:"response"`
}
