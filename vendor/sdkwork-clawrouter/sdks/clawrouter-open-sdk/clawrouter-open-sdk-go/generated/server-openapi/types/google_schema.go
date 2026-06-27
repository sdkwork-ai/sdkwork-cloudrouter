package types

// Google Gemini google schema schema exposed by Claw Router vendor routing.
type GoogleSchema struct {
	Description string `json:"description"`
	Enum []string `json:"enum"`
	Format string `json:"format"`
	Items interface{} `json:"items"`
	Nullable bool `json:"nullable"`
	Properties map[string]interface{} `json:"properties"`
	Required []string `json:"required"`
	Type string `json:"type"`
}
