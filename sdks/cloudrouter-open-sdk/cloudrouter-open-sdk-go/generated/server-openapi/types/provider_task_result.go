package types

// Provider task result payload with common media result fields and typed extension values.
type ProviderTaskResult struct {
	Audios []ProviderGeneratedMedia `json:"audios"`
	Content []VolcengineContentPart `json:"content"`
	Id string `json:"id"`
	Images []ProviderGeneratedMedia `json:"images"`
	Metadata ProviderMetadata `json:"metadata"`
	Status string `json:"status"`
	Text string `json:"text"`
	Videos []ProviderGeneratedMedia `json:"videos"`
}
