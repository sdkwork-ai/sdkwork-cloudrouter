package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type AudioViduApi struct {
    client *sdkhttp.Client
}

func NewAudioViduApi(client *sdkhttp.Client) *AudioViduApi {
    return &AudioViduApi{client: client}
}

// Vidu text to audio
func (a *AudioViduApi) CreateEntV2Text2audio(body sdktypes.ViduTextToAudioRequest) (sdktypes.ViduAudioGenerationTask, error) {
    raw, err := a.client.Post("/vidu/ent/v2/text2audio", body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.ViduAudioGenerationTask
        return zero, err
    }
    return decodeResult[sdktypes.ViduAudioGenerationTask](raw)
}

// Vidu timing to audio
func (a *AudioViduApi) CreateEntV2Timing2audio(body sdktypes.ViduTimingToAudioRequest) (sdktypes.ViduAudioGenerationTask, error) {
    raw, err := a.client.Post("/vidu/ent/v2/timing2audio", body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.ViduAudioGenerationTask
        return zero, err
    }
    return decodeResult[sdktypes.ViduAudioGenerationTask](raw)
}
