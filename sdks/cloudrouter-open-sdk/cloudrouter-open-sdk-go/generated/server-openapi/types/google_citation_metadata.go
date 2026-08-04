package types

// Citation metadata returned by Gemini.
type GoogleCitationMetadata struct {
	CitationSources []GoogleCitationSource `json:"citationSources"`
}
