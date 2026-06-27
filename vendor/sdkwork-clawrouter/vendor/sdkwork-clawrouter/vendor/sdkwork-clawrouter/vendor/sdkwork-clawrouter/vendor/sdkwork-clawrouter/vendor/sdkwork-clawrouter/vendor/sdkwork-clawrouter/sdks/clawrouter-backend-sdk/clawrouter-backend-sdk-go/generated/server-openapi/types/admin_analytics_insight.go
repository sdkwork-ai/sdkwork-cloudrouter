package types

// Admin analytics insight schema exposed by Claw Router.
type AdminAnalyticsInsight struct {
	Detail string `json:"detail"`
	Key string `json:"key"`
	Severity string `json:"severity"`
	Title string `json:"title"`
	Value string `json:"value"`
}
