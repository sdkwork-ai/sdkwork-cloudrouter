package types

// Admin analytics trend point schema exposed by Claw Router.
type AdminAnalyticsTrendPoint struct {
	Points float64 `json:"points"`
	Requests float64 `json:"requests"`
	Time string `json:"time"`
	Tokens float64 `json:"tokens"`
	Users string `json:"users"`
}
