package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class GeminiVideoOperation {
    private Boolean done;
    private Map<String, String> error;
    private String name;
    private Map<String, String> response;

    public Boolean getDone() {
        return this.done;
    }

    public void setDone(Boolean done) {
        this.done = done;
    }

    public Map<String, String> getError() {
        return this.error;
    }

    public void setError(Map<String, String> error) {
        this.error = error;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Map<String, String> getResponse() {
        return this.response;
    }

    public void setResponse(Map<String, String> response) {
        this.response = response;
    }
}
