package types

// Admin runtime region settings response schema exposed by Claw Router.
type AdminRuntimeRegionSettingsResponse struct {
	CurrentRegionCode string `json:"currentRegionCode"`
	CurrentRegionName string `json:"currentRegionName"`
	Remark string `json:"remark"`
}
