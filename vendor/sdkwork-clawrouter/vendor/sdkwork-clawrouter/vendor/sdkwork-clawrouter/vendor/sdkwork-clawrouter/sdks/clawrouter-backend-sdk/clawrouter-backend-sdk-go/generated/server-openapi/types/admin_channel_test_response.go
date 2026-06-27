package types

// Admin channel test response schema exposed by Claw Router.
type AdminChannelTestResponse struct {
	ChannelId string `json:"channelId"`
	Item AdminChannelItem `json:"item"`
	Latency string `json:"latency"`
	Status string `json:"status"`
	Success bool `json:"success"`
}
