package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type AudioMinimaxApi struct {
    client *sdkhttp.Client
}

func NewAudioMinimaxApi(client *sdkhttp.Client) *AudioMinimaxApi {
    return &AudioMinimaxApi{client: client}
}

// MiniMax speech synthesis
func (a *AudioMinimaxApi) CreateV1T2aV(body sdktypes.MinimaxTextToSpeechRequest) (sdktypes.MinimaxTextToSpeechResponse, error) {
    raw, err := a.client.Post("/minimax/v1/t2a_v2", body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.MinimaxTextToSpeechResponse
        return zero, err
    }
    return decodeResult[sdktypes.MinimaxTextToSpeechResponse](raw)
}
