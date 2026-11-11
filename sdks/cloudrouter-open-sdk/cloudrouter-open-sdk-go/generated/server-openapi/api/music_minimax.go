package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type MusicMinimaxApi struct {
    client *sdkhttp.Client
}

func NewMusicMinimaxApi(client *sdkhttp.Client) *MusicMinimaxApi {
    return &MusicMinimaxApi{client: client}
}

// Minimax create music generation
func (a *MusicMinimaxApi) CreateV1MusicGeneration(body sdktypes.MiniMaxMusicGenerationRequest) (sdktypes.MiniMaxMusicGenerationResponse, error) {
    raw, err := a.client.Post("/minimax/v1/music_generation", body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.MiniMaxMusicGenerationResponse
        return zero, err
    }
    return decodeResult[sdktypes.MiniMaxMusicGenerationResponse](raw)
}
