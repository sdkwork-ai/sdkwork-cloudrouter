package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class MinimaxImageGenerationResponse {
    private MinimaxBaseResp baseResp;
    private MinimaxImageData data;
    private String id;
    private Map<String, String> metadata;

    public MinimaxBaseResp getBaseResp() {
        return this.baseResp;
    }

    public void setBaseResp(MinimaxBaseResp baseResp) {
        this.baseResp = baseResp;
    }

    public MinimaxImageData getData() {
        return this.data;
    }

    public void setData(MinimaxImageData data) {
        this.data = data;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }
}
