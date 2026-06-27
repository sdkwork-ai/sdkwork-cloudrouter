package com.sdkwork.clawrouter.open.model;

import java.util.List;
import java.util.Map;

public class OpenAiConversationItemCreateRequest {
    private List<OpenAiConversationContentPart> content;
    private Map<String, String> metadata;
    private String role;
    private String type;

    public List<OpenAiConversationContentPart> getContent() {
        return this.content;
    }

    public void setContent(List<OpenAiConversationContentPart> content) {
        this.content = content;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
