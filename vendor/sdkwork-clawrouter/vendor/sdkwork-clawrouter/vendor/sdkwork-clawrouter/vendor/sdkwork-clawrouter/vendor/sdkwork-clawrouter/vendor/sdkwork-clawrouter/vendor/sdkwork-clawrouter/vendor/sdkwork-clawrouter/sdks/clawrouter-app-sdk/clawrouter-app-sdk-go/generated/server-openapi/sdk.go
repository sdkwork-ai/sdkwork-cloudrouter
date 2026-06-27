package app

import (
    "github.com/sdkwork/clawrouter-app-sdk/api"
    sdkhttp "github.com/sdkwork/clawrouter-app-sdk/http"
)

type SdkworkAppClient struct {
    http *sdkhttp.Client
    Ai *api.AiApi
    Chat *api.ChatApi
    Iam *api.IamApi
    Notification *api.NotificationApi
    Runtime *api.RuntimeApi
    System *api.SystemApi
}

func NewSdkworkAppClient(baseURL string) *SdkworkAppClient {
    cfg := sdkhttp.NewDefaultConfig(baseURL)
    return NewSdkworkAppClientWithConfig(cfg)
}

func NewSdkworkAppClientWithConfig(config sdkhttp.Config) *SdkworkAppClient {
    client := sdkhttp.NewClient(config)
    return &SdkworkAppClient{
        http: client,
        Ai: api.NewAiApi(client),
        Chat: api.NewChatApi(client),
        Iam: api.NewIamApi(client),
        Notification: api.NewNotificationApi(client),
        Runtime: api.NewRuntimeApi(client),
        System: api.NewSystemApi(client),
    }
}

func (c *SdkworkAppClient) SetAuthToken(token string) *SdkworkAppClient {
    c.http.SetAuthToken(token)
    return c
}

func (c *SdkworkAppClient) SetAccessToken(token string) *SdkworkAppClient {
    c.http.SetAccessToken(token)
    return c
}

func (c *SdkworkAppClient) SetHeader(key string, value string) *SdkworkAppClient {
    c.http.SetHeader(key, value)
    return c
}

func (c *SdkworkAppClient) Http() *sdkhttp.Client {
    return c.http
}
