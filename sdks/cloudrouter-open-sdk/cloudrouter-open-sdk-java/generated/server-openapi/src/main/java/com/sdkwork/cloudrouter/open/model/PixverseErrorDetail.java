package com.sdkwork.cloudrouter.open.model;

import java.util.Map;

public class PixverseErrorDetail {
    private String message;
    private Map<String, String> param;
    private String type;

    public String getMessage() {
        return this.message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Map<String, String> getParam() {
        return this.param;
    }

    public void setParam(Map<String, String> param) {
        this.param = param;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
