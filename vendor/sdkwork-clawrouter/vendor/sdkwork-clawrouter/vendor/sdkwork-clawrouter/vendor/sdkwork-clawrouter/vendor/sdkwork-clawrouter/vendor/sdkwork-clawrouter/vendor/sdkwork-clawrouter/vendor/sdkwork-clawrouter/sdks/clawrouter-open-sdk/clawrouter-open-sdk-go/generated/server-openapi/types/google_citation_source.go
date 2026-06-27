package types

// Single citation source returned by Gemini.
type GoogleCitationSource struct {
	EndIndex int `json:"endIndex"`
	License string `json:"license"`
	StartIndex int `json:"startIndex"`
	Uri string `json:"uri"`
}
