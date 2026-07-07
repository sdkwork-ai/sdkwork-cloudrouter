package api

import (
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-backend-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-backend-sdk/http"
)

type SitesApi struct {
    client *sdkhttp.Client
}

func NewSitesApi(client *sdkhttp.Client) *SitesApi {
    return &SitesApi{client: client}
}

// List
func (a *SitesApi) SiteCatalogList() (sdktypes.SiteCatalogListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/sites"), nil, nil)
    if err != nil {
        var zero sdktypes.SiteCatalogListResult
        return zero, err
    }
    return decodeResult[sdktypes.SiteCatalogListResult](raw)
}

// Create
func (a *SitesApi) SiteCreate() (sdktypes.SiteCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/sites"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.SiteCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.SiteCreateResult](raw)
}

// Delete
func (a *SitesApi) SiteDelete(siteId string) (sdktypes.SiteDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/sites/%s", SerializePathParameter(siteId, PathParameterSpec{Name: "siteId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SiteDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.SiteDeleteResult](raw)
}

// Update
func (a *SitesApi) SiteUpdate(siteId string) (sdktypes.SiteUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/sites/%s", SerializePathParameter(siteId, PathParameterSpec{Name: "siteId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.SiteUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.SiteUpdateResult](raw)
}

// List
func (a *SitesApi) SiteChannelsList(siteId string) (sdktypes.SiteChannelsListResult, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/sites/%s/channels", SerializePathParameter(siteId, PathParameterSpec{Name: "siteId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.SiteChannelsListResult
        return zero, err
    }
    return decodeResult[sdktypes.SiteChannelsListResult](raw)
}

// Create
func (a *SitesApi) HealthCheckCreate(siteId string) (sdktypes.HealthCheckCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/sites/%s/health_check", SerializePathParameter(siteId, PathParameterSpec{Name: "siteId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.HealthCheckCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.HealthCheckCreateResult](raw)
}

// Create
func (a *SitesApi) TestConnectionCreate(siteId string) (sdktypes.TestConnectionCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/sites/%s/test_connection", SerializePathParameter(siteId, PathParameterSpec{Name: "siteId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.TestConnectionCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.TestConnectionCreateResult](raw)
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
