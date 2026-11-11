package types

// Anthropic server tool definition (bash, text editor, web search, or tool search).
type AnthropicServerTool struct {
	AllowedCallers []string `json:"allowed_callers"`
	AllowedDomains []string `json:"allowed_domains"`
	BlockedDomains []string `json:"blocked_domains"`
	CacheControl AnthropicCacheControl `json:"cache_control"`
	DeferLoading bool `json:"defer_loading"`
	DisplayHeightPx int `json:"display_height_px"`
	DisplayNumber int `json:"display_number"`
	DisplayWidthPx int `json:"display_width_px"`
	MaxCharacters int `json:"max_characters"`
	MaxUses int `json:"max_uses"`
	Name string `json:"name"`
	Strict bool `json:"strict"`
	Type string `json:"type"`
	UserLocation map[string]ProviderJsonValue `json:"user_location"`
}
