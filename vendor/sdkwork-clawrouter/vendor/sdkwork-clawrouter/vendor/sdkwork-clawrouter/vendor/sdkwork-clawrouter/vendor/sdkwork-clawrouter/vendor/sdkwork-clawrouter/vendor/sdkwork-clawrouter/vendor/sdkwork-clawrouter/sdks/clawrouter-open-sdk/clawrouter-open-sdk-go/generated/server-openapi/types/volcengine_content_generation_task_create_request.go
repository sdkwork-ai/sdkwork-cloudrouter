package types

// Volcengine Ark volcengine content generation task create request schema exposed by Claw Router vendor routing.
type VolcengineContentGenerationTaskCreateRequest struct {
	CallbackUrl string `json:"callback_url"`
	Content []VolcengineContentPart `json:"content"`
	Metadata ProviderMetadata `json:"metadata"`
	Model string `json:"model"`
}
