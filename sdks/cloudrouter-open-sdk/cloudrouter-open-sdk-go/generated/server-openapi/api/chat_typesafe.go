package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type ChatTypesafeApi struct {
    client *sdkhttp.Client
}

func NewChatTypesafeApi(client *sdkhttp.Client) *ChatTypesafeApi {
    return &ChatTypesafeApi{client: client}
}

// TypeSafe AI System One decision
func (a *ChatTypesafeApi) CreateV1Systemone(body sdktypes.TypeSafeSystemOneRequest) (sdktypes.TypeSafeSystemOneResponse, error) {
    raw, err := a.client.Post("/typesafe/v1/systemone", body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.TypeSafeSystemOneResponse
        return zero, err
    }
    return decodeResult[sdktypes.TypeSafeSystemOneResponse](raw)
}
