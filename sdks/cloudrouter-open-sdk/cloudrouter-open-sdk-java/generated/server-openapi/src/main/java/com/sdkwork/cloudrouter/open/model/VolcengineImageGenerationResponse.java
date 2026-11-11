package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class VolcengineImageGenerationResponse {
    private Integer created;
    private List<ArkImageGenerationData> data;
    private ProviderTaskError error;
    private String model;
    private List<ArkWebSearchTool> tools;
    private ArkImageUsage usage;

    public Integer getCreated() {
        return this.created;
    }

    public void setCreated(Integer created) {
        this.created = created;
    }

    public List<ArkImageGenerationData> getData() {
        return this.data;
    }

    public void setData(List<ArkImageGenerationData> data) {
        this.data = data;
    }

    public ProviderTaskError getError() {
        return this.error;
    }

    public void setError(ProviderTaskError error) {
        this.error = error;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public List<ArkWebSearchTool> getTools() {
        return this.tools;
    }

    public void setTools(List<ArkWebSearchTool> tools) {
        this.tools = tools;
    }

    public ArkImageUsage getUsage() {
        return this.usage;
    }

    public void setUsage(ArkImageUsage usage) {
        this.usage = usage;
    }
}
