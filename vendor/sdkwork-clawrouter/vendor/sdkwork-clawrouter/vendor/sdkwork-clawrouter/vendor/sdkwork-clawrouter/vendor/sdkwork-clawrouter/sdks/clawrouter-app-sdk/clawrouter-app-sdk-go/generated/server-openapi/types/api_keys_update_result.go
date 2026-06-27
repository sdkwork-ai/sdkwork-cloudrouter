package types

// Api keys update result schema exposed by Claw Router.
type ApiKeysUpdateResult struct {
	Code string `json:"code"`
	Data UpdateApiKeyResponse `json:"data"`
	Msg string `json:"msg"`
}
