package com.sdkwork.clawrouter.open.model;

import java.util.Map;

public class OpenAiSkillVersion {
    private Integer createdAt;
    private String id;
    private Map<String, String> metadata;
    private String object;
    private String packageSha256;
    private String skillId;
    private String status;
    private String version;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public String getPackageSha256() {
        return this.packageSha256;
    }

    public void setPackageSha256(String packageSha256) {
        this.packageSha256 = packageSha256;
    }

    public String getSkillId() {
        return this.skillId;
    }

    public void setSkillId(String skillId) {
        this.skillId = skillId;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getVersion() {
        return this.version;
    }

    public void setVersion(String version) {
        this.version = version;
    }
}
