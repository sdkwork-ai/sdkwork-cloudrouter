package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleFunctionCallingConfig {
    private List<String> allowedFunctionNames;
    private String mode;

    public List<String> getAllowedFunctionNames() {
        return this.allowedFunctionNames;
    }

    public void setAllowedFunctionNames(List<String> allowedFunctionNames) {
        this.allowedFunctionNames = allowedFunctionNames;
    }

    public String getMode() {
        return this.mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }
}
