package types

// Create api key request schema exposed by Claw Router.
type CreateApiKeyRequest struct {
	ChannelGroup string `json:"channelGroup"`
	DefaultForRuntime bool `json:"defaultForRuntime"`
	Expires string `json:"expires"`
	IpLimit string `json:"ipLimit"`
	IsUnlimitedQuota bool `json:"isUnlimitedQuota"`
	Modalities []string `json:"modalities"`
	Name string `json:"name"`
	Quota string `json:"quota"`
}
