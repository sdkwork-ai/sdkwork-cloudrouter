package types

// Dynamic retrieval configuration for Google Search grounding.
type GoogleDynamicRetrievalConfig struct {
	DynamicThreshold float64 `json:"dynamicThreshold"`
	Mode string `json:"mode"`
}
