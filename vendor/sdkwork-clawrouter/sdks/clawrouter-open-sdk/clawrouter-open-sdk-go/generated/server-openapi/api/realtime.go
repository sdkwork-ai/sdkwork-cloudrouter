package api

import (
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-open-sdk/http"
)

type RealtimeApi struct {
    client *sdkhttp.Client
}

func NewRealtimeApi(client *sdkhttp.Client) *RealtimeApi {
    return &RealtimeApi{client: client}
}

// Create realtime call
func (a *RealtimeApi) CreateCall(body sdktypes.OpenAiRealtimeCallCreateRequest) (sdktypes.SdpResponse, error) {
    raw, err := a.client.Post(AiApiPath("/realtime/calls"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.SdpResponse
        return zero, err
    }
    return decodeResult[sdktypes.SdpResponse](raw)
}

// Accept realtime call
func (a *RealtimeApi) CreateCallsAccept(callId string, body sdktypes.OpenAiRealtimeCallActionRequest) (sdktypes.OpenAiRealtimeCall, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/realtime/calls/%s/accept", SerializePathParameter(callId, PathParameterSpec{Name: "call_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiRealtimeCall
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRealtimeCall](raw)
}

// Hang up realtime call
func (a *RealtimeApi) CreateCallsHangup(callId string, body sdktypes.OpenAiRealtimeCallActionRequest) (sdktypes.OpenAiRealtimeCall, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/realtime/calls/%s/hangup", SerializePathParameter(callId, PathParameterSpec{Name: "call_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiRealtimeCall
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRealtimeCall](raw)
}

// Refer realtime call
func (a *RealtimeApi) CreateCallsRefer(callId string, body sdktypes.OpenAiRealtimeCallReferRequest) (sdktypes.OpenAiRealtimeCall, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/realtime/calls/%s/refer", SerializePathParameter(callId, PathParameterSpec{Name: "call_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiRealtimeCall
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRealtimeCall](raw)
}

// Reject realtime call
func (a *RealtimeApi) CreateCallsReject(callId string, body sdktypes.OpenAiRealtimeCallActionRequest) (sdktypes.OpenAiRealtimeCall, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/realtime/calls/%s/reject", SerializePathParameter(callId, PathParameterSpec{Name: "call_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiRealtimeCall
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRealtimeCall](raw)
}

// Create realtime client secret
func (a *RealtimeApi) CreateClientSecret(body sdktypes.OpenAiRealtimeClientSecretCreateRequest) (sdktypes.OpenAiRealtimeClientSecret, error) {
    raw, err := a.client.Post(AiApiPath("/realtime/client_secrets"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiRealtimeClientSecret
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRealtimeClientSecret](raw)
}

// Create realtime session
func (a *RealtimeApi) CreateSession(body sdktypes.OpenAiRealtimeSessionCreateRequest) (sdktypes.OpenAiRealtimeSession, error) {
    raw, err := a.client.Post(AiApiPath("/realtime/sessions"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiRealtimeSession
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRealtimeSession](raw)
}

// Create realtime transcription session
func (a *RealtimeApi) CreateTranscriptionSession(body sdktypes.OpenAiRealtimeTranscriptionSessionCreateRequest) (sdktypes.OpenAiRealtimeTranscriptionSession, error) {
    raw, err := a.client.Post(AiApiPath("/realtime/transcription_sessions"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiRealtimeTranscriptionSession
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRealtimeTranscriptionSession](raw)
}

// Create realtime translation session
func (a *RealtimeApi) CreateTranslation(body sdktypes.OpenAiRealtimeTranslationSessionCreateRequest) (sdktypes.OpenAiRealtimeTranslationSession, error) {
    raw, err := a.client.Post(AiApiPath("/realtime/translations"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiRealtimeTranslationSession
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRealtimeTranslationSession](raw)
}

type PathParameterSpec struct {
    Name    string
    Style   string
    Explode bool
}

func SerializePathParameter(value interface{}, spec PathParameterSpec) string {
    if value == nil {
        return ""
    }
    style := spec.Style
    if style == "" {
        style = "simple"
    }

    switch typed := value.(type) {
    case []string:
        return SerializePathArray(spec.Name, stringSliceToInterface(typed), style, spec.Explode)
    case []int:
        return SerializePathArray(spec.Name, intSliceToInterface(typed), style, spec.Explode)
    case []interface{}:
        return SerializePathArray(spec.Name, typed, style, spec.Explode)
    case map[string]string:
        return SerializePathObject(spec.Name, stringMapToInterface(typed), style, spec.Explode)
    case map[string]int:
        return SerializePathObject(spec.Name, intMapToInterface(typed), style, spec.Explode)
    case map[string]interface{}:
        return SerializePathObject(spec.Name, typed, style, spec.Explode)
    default:
        return PathPrefix(spec.Name, style) + url.PathEscape(fmt.Sprint(value))
    }
}

func SerializePathArray(name string, values []interface{}, style string, explode bool) string {
    serialized := make([]string, 0, len(values))
    for _, item := range values {
        if item != nil {
            serialized = append(serialized, url.PathEscape(fmt.Sprint(item)))
        }
    }
    if len(serialized) == 0 {
        return PathPrefix(name, style)
    }
    if style == "matrix" {
        if explode {
            parts := make([]string, 0, len(serialized))
            for _, item := range serialized {
                parts = append(parts, ";"+name+"="+item)
            }
            return strings.Join(parts, "")
        }
        return ";" + name + "=" + strings.Join(serialized, ",")
    }
    separator := ","
    if explode {
        separator = "."
    }
    return PathPrefix(name, style) + strings.Join(serialized, separator)
}

func SerializePathObject(name string, values map[string]interface{}, style string, explode bool) string {
    entries := make([]string, 0, len(values)*2)
    exploded := make([]string, 0, len(values))
    for key, value := range values {
        if value == nil {
            continue
        }
        escapedKey := url.PathEscape(key)
        escapedValue := url.PathEscape(fmt.Sprint(value))
        if explode {
            if style == "matrix" {
                exploded = append(exploded, ";"+escapedKey+"="+escapedValue)
            } else {
                exploded = append(exploded, escapedKey+"="+escapedValue)
            }
        } else {
            entries = append(entries, escapedKey, escapedValue)
        }
    }
    if style == "matrix" {
        if explode {
            return strings.Join(exploded, "")
        }
        return ";" + name + "=" + strings.Join(entries, ",")
    }
    if explode {
        separator := ","
        if style == "label" {
            separator = "."
        }
        return PathPrefix(name, style) + strings.Join(exploded, separator)
    }
    return PathPrefix(name, style) + strings.Join(entries, ",")
}

func PathPrefix(name string, style string) string {
    if style == "label" {
        return "."
    }
    if style == "matrix" {
        return ";" + name
    }
    return ""
}


func stringSliceToInterface(values []string) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func intSliceToInterface(values []int) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func stringMapToInterface(values map[string]string) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}

func intMapToInterface(values map[string]int) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}
