package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class GoogleFunctionResponse {
    private String name;
    private Map<String, Object> response;

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Map<String, Object> getResponse() {
        return this.response;
    }

    public void setResponse(Map<String, Object> response) {
        this.response = response;
    }
}
