package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type AudioAlibabaApi struct {
    client *sdkhttp.Client
}

func NewAudioAlibabaApi(client *sdkhttp.Client) *AudioAlibabaApi {
    return &AudioAlibabaApi{client: client}
}

// Alibaba Qwen TTS speech synthesis
func (a *AudioAlibabaApi) CreateApiV1ServicesAudioTtsSpeechSynthesizer(body sdktypes.AlibabaSpeechRequest) (sdktypes.AlibabaSpeechResponse, error) {
    raw, err := a.client.Post("/alibaba/api/v1/services/audio/tts/SpeechSynthesizer", body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.AlibabaSpeechResponse
        return zero, err
    }
    return decodeResult[sdktypes.AlibabaSpeechResponse](raw)
}
