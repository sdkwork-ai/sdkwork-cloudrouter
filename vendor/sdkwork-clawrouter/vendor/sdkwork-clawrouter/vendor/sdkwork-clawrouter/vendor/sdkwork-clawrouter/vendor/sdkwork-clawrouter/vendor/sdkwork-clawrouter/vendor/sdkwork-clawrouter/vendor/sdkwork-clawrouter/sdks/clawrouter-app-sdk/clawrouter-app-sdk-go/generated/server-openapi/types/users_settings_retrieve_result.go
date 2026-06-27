package types

// Users settings retrieve result schema exposed by Claw Router.
type UsersSettingsRetrieveResult struct {
	Code string `json:"code"`
	Data SettingsDataResponse `json:"data"`
	Msg string `json:"msg"`
}
