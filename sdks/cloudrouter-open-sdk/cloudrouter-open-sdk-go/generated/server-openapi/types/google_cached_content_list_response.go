package types

// Google Gemini google cached content list response schema exposed by Cloud Router vendor routing.
type GoogleCachedContentListResponse struct {
	CachedContents []GoogleCachedContent `json:"cachedContents"`
	NextPageToken string `json:"nextPageToken"`
}
