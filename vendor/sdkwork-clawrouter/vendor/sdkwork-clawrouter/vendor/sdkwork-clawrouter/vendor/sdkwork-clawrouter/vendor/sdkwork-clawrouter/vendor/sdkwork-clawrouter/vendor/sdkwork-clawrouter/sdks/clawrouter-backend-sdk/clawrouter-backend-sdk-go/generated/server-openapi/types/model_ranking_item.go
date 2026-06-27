package types

// Model ranking item schema exposed by Claw Router.
type ModelRankingItem struct {
	BaseVolume string `json:"baseVolume"`
	Color string `json:"color"`
	ContextSize string `json:"contextSize"`
	Cost float64 `json:"cost"`
	CostIndicator string `json:"costIndicator"`
	Currency string `json:"currency"`
	Id string `json:"id"`
	IsNew bool `json:"isNew"`
	Latency string `json:"latency"`
	License string `json:"license"`
	Modality string `json:"modality"`
	Name string `json:"name"`
	PrevRank string `json:"prevRank"`
	Pricing string `json:"pricing"`
	Rank string `json:"rank"`
	Requests string `json:"requests"`
	Strengths []string `json:"strengths"`
	Tokens string `json:"tokens"`
	TrendScore float64 `json:"trendScore"`
	Vendor string `json:"vendor"`
	VendorCode string `json:"vendorCode"`
	WinRate float64 `json:"winRate"`
}
