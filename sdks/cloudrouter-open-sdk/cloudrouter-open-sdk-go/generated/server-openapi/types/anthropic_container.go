package types

// Anthropic container selection and skills.
type AnthropicContainer struct {
	Id string `json:"id"`
	Skills []AnthropicSkill `json:"skills"`
}
