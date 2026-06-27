package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleCachedContent {
    private List<GoogleContent> contents;
    private String createTime;
    private String displayName;
    private String expireTime;
    private String model;
    private String name;
    private GoogleContent systemInstruction;
    private GoogleToolConfig toolConfig;
    private List<GoogleTool> tools;
    private String updateTime;
    private GoogleCachedContentUsageMetadata usageMetadata;

    public List<GoogleContent> getContents() {
        return this.contents;
    }

    public void setContents(List<GoogleContent> contents) {
        this.contents = contents;
    }

    public String getCreateTime() {
        return this.createTime;
    }

    public void setCreateTime(String createTime) {
        this.createTime = createTime;
    }

    public String getDisplayName() {
        return this.displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getExpireTime() {
        return this.expireTime;
    }

    public void setExpireTime(String expireTime) {
        this.expireTime = expireTime;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public GoogleContent getSystemInstruction() {
        return this.systemInstruction;
    }

    public void setSystemInstruction(GoogleContent systemInstruction) {
        this.systemInstruction = systemInstruction;
    }

    public GoogleToolConfig getToolConfig() {
        return this.toolConfig;
    }

    public void setToolConfig(GoogleToolConfig toolConfig) {
        this.toolConfig = toolConfig;
    }

    public List<GoogleTool> getTools() {
        return this.tools;
    }

    public void setTools(List<GoogleTool> tools) {
        this.tools = tools;
    }

    public String getUpdateTime() {
        return this.updateTime;
    }

    public void setUpdateTime(String updateTime) {
        this.updateTime = updateTime;
    }

    public GoogleCachedContentUsageMetadata getUsageMetadata() {
        return this.usageMetadata;
    }

    public void setUsageMetadata(GoogleCachedContentUsageMetadata usageMetadata) {
        this.usageMetadata = usageMetadata;
    }
}
