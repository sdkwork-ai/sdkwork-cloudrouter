package types

// Google Search grounding tool configuration.
type GoogleSearchTool struct {
	DynamicRetrievalConfig GoogleDynamicRetrievalConfig `json:"dynamicRetrievalConfig"`
}
