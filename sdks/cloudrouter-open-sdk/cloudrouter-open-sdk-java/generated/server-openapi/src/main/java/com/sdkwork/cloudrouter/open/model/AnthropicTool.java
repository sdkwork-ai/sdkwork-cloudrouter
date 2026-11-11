package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class AnthropicTool {
    private List<String> allowedCallers;
    private AnthropicCacheControl cacheControl;
    private Boolean deferLoading;
    private String description;
    private Boolean eagerInputStreaming;
    private List<Map<String, String>> inputExamples;
    private ProviderJsonSchema inputSchema;
    private String name;
    private Boolean strict;
    private String type;

    public List<String> getAllowedCallers() {
        return this.allowedCallers;
    }

    public void setAllowedCallers(List<String> allowedCallers) {
        this.allowedCallers = allowedCallers;
    }

    public AnthropicCacheControl getCacheControl() {
        return this.cacheControl;
    }

    public void setCacheControl(AnthropicCacheControl cacheControl) {
        this.cacheControl = cacheControl;
    }

    public Boolean getDeferLoading() {
        return this.deferLoading;
    }

    public void setDeferLoading(Boolean deferLoading) {
        this.deferLoading = deferLoading;
    }

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getEagerInputStreaming() {
        return this.eagerInputStreaming;
    }

    public void setEagerInputStreaming(Boolean eagerInputStreaming) {
        this.eagerInputStreaming = eagerInputStreaming;
    }

    public List<Map<String, String>> getInputExamples() {
        return this.inputExamples;
    }

    public void setInputExamples(List<Map<String, String>> inputExamples) {
        this.inputExamples = inputExamples;
    }

    public ProviderJsonSchema getInputSchema() {
        return this.inputSchema;
    }

    public void setInputSchema(ProviderJsonSchema inputSchema) {
        this.inputSchema = inputSchema;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Boolean getStrict() {
        return this.strict;
    }

    public void setStrict(Boolean strict) {
        this.strict = strict;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
