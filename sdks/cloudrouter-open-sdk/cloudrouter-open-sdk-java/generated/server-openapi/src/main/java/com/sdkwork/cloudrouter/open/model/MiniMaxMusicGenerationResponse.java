package com.sdkwork.cloudrouter.open.model;


public class MiniMaxMusicGenerationResponse {
    private MiniMaxMusicBaseResp baseResp;
    private MiniMaxMusicData data;
    private String traceId;

    public MiniMaxMusicBaseResp getBaseResp() {
        return this.baseResp;
    }

    public void setBaseResp(MiniMaxMusicBaseResp baseResp) {
        this.baseResp = baseResp;
    }

    public MiniMaxMusicData getData() {
        return this.data;
    }

    public void setData(MiniMaxMusicData data) {
        this.data = data;
    }

    public String getTraceId() {
        return this.traceId;
    }

    public void setTraceId(String traceId) {
        this.traceId = traceId;
    }
}
