package types

// Admin runtime region settings update request schema exposed by Claw Router.
type AdminRuntimeRegionSettingsUpdateRequest struct {
	CurrentRegionCode string `json:"currentRegionCode"`
	CurrentRegionName string `json:"currentRegionName"`
	Remark string `json:"remark"`
}
