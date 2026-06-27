package api

import (
    sdktypes "github.com/sdkwork/clawrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-open-sdk/http"
)

type ModerationsApi struct {
    client *sdkhttp.Client
}

func NewModerationsApi(client *sdkhttp.Client) *ModerationsApi {
    return &ModerationsApi{client: client}
}

// Create moderation
func (a *ModerationsApi) Create(body sdktypes.OpenAiModerationCreateRequest) (sdktypes.OpenAiModeration, error) {
    raw, err := a.client.Post(AiApiPath("/moderations"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiModeration
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiModeration](raw)
}
