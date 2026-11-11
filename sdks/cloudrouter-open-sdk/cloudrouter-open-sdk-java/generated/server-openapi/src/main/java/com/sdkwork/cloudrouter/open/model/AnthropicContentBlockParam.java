package com.sdkwork.cloudrouter.open.model;

import java.util.List;
import java.util.Map;

public class AnthropicContentBlockParam {
    private AnthropicCacheControl cacheControl;
    private Map<String, String> caller;
    private List<Map<String, String>> citations;
    private String content;
    private String context;
    private String data;
    private String id;
    private Map<String, String> input;
    private Boolean isError;
    private String name;
    private String signature;
    private AnthropicContentSource source;
    private String text;
    private String thinking;
    private String title;
    private String toolUseId;
    private String toolsetName;
    private String type;

    public AnthropicCacheControl getCacheControl() {
        return this.cacheControl;
    }

    public void setCacheControl(AnthropicCacheControl cacheControl) {
        this.cacheControl = cacheControl;
    }

    public Map<String, String> getCaller() {
        return this.caller;
    }

    public void setCaller(Map<String, String> caller) {
        this.caller = caller;
    }

    public List<Map<String, String>> getCitations() {
        return this.citations;
    }

    public void setCitations(List<Map<String, String>> citations) {
        this.citations = citations;
    }

    public String getContent() {
        return this.content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getContext() {
        return this.context;
    }

    public void setContext(String context) {
        this.context = context;
    }

    public String getData() {
        return this.data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Map<String, String> getInput() {
        return this.input;
    }

    public void setInput(Map<String, String> input) {
        this.input = input;
    }

    public Boolean getIsError() {
        return this.isError;
    }

    public void setIsError(Boolean isError) {
        this.isError = isError;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSignature() {
        return this.signature;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public AnthropicContentSource getSource() {
        return this.source;
    }

    public void setSource(AnthropicContentSource source) {
        this.source = source;
    }

    public String getText() {
        return this.text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getThinking() {
        return this.thinking;
    }

    public void setThinking(String thinking) {
        this.thinking = thinking;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getToolUseId() {
        return this.toolUseId;
    }

    public void setToolUseId(String toolUseId) {
        this.toolUseId = toolUseId;
    }

    public String getToolsetName() {
        return this.toolsetName;
    }

    public void setToolsetName(String toolsetName) {
        this.toolsetName = toolsetName;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
