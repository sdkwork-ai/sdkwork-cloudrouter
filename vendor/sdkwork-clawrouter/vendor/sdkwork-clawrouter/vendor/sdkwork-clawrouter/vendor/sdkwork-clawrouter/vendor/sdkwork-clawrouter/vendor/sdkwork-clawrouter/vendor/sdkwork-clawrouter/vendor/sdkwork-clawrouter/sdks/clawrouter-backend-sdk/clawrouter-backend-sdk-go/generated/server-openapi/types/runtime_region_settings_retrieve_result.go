package types

// Runtime region settings retrieve result schema exposed by Claw Router.
type RuntimeRegionSettingsRetrieveResult struct {
	Code string `json:"code"`
	Data AdminRuntimeRegionSettingsResponse `json:"data"`
	Msg string `json:"msg"`
}
