package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class MinimaxTextToSpeechResponse {
    private MinimaxBaseResp baseResp;
    private Map<String, String> data;
    private Map<String, String> extraInfo;
    private String traceId;

    public MinimaxBaseResp getBaseResp() {
        return this.baseResp;
    }

    public void setBaseResp(MinimaxBaseResp baseResp) {
        this.baseResp = baseResp;
    }

    public Map<String, String> getData() {
        return this.data;
    }

    public void setData(Map<String, String> data) {
        this.data = data;
    }

    public Map<String, String> getExtraInfo() {
        return this.extraInfo;
    }

    public void setExtraInfo(Map<String, String> extraInfo) {
        this.extraInfo = extraInfo;
    }

    public String getTraceId() {
        return this.traceId;
    }

    public void setTraceId(String traceId) {
        this.traceId = traceId;
    }
}
