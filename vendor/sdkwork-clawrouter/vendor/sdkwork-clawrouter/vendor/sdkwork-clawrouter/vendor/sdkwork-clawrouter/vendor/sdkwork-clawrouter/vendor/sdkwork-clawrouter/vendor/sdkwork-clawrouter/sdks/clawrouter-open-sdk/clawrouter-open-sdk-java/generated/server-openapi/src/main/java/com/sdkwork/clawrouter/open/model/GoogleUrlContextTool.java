package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleUrlContextTool {
    private List<String> allowedDomains;

    public List<String> getAllowedDomains() {
        return this.allowedDomains;
    }

    public void setAllowedDomains(List<String> allowedDomains) {
        this.allowedDomains = allowedDomains;
    }
}
