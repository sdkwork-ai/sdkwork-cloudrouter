package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminChannelGroupChannelBindingInput {
    private List<String> apiScope;
    private List<String> capabilities;
    private String channelId;
    private Integer priority;
    private List<String> resourceCodes;
    private String status;
    private Integer weight;

    public List<String> getApiScope() {
        return this.apiScope;
    }

    public void setApiScope(List<String> apiScope) {
        this.apiScope = apiScope;
    }

    public List<String> getCapabilities() {
        return this.capabilities;
    }

    public void setCapabilities(List<String> capabilities) {
        this.capabilities = capabilities;
    }

    public String getChannelId() {
        return this.channelId;
    }

    public void setChannelId(String channelId) {
        this.channelId = channelId;
    }

    public Integer getPriority() {
        return this.priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public List<String> getResourceCodes() {
        return this.resourceCodes;
    }

    public void setResourceCodes(List<String> resourceCodes) {
        this.resourceCodes = resourceCodes;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getWeight() {
        return this.weight;
    }

    public void setWeight(Integer weight) {
        this.weight = weight;
    }
}
