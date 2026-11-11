package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class MinimaxFileRetrieveResponse {
    private MinimaxBaseResp baseResp;
    private Map<String, String> file;

    public MinimaxBaseResp getBaseResp() {
        return this.baseResp;
    }

    public void setBaseResp(MinimaxBaseResp baseResp) {
        this.baseResp = baseResp;
    }

    public Map<String, String> getFile() {
        return this.file;
    }

    public void setFile(Map<String, String> file) {
        this.file = file;
    }
}
