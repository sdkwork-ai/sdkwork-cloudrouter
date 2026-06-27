package types

// Regional official reference pricing returned by admin AI model payloads.
type AdminAiModelRegionPrice struct {
	CacheReadPrice string `json:"cacheReadPrice"`
	CacheWritePrice string `json:"cacheWritePrice"`
	Currency string `json:"currency"`
	PriceIn string `json:"priceIn"`
	PriceOut string `json:"priceOut"`
	RegionCode string `json:"regionCode"`
}
