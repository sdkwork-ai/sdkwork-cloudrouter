package types

// Runtime region settings update result schema exposed by Claw Router.
type RuntimeRegionSettingsUpdateResult struct {
	Code string `json:"code"`
	Data AdminRuntimeRegionSettingsResponse `json:"data"`
	Msg string `json:"msg"`
}
