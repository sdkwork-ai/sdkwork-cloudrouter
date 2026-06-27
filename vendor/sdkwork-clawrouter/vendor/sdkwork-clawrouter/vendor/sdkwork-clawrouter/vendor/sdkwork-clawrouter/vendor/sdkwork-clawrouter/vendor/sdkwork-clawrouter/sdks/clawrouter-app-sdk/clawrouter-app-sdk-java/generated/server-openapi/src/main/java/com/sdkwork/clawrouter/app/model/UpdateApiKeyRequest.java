package com.sdkwork.clawrouter.app.model;

import java.util.List;

public class UpdateApiKeyRequest {
    private String channelGroup;
    private Boolean defaultForRuntime;
    private String expires;
    private String ipLimit;
    private Boolean isUnlimitedQuota;
    private List<String> modalities;
    private String name;
    private String quota;

    public String getChannelGroup() {
        return this.channelGroup;
    }

    public void setChannelGroup(String channelGroup) {
        this.channelGroup = channelGroup;
    }

    public Boolean getDefaultForRuntime() {
        return this.defaultForRuntime;
    }

    public void setDefaultForRuntime(Boolean defaultForRuntime) {
        this.defaultForRuntime = defaultForRuntime;
    }

    public String getExpires() {
        return this.expires;
    }

    public void setExpires(String expires) {
        this.expires = expires;
    }

    public String getIpLimit() {
        return this.ipLimit;
    }

    public void setIpLimit(String ipLimit) {
        this.ipLimit = ipLimit;
    }

    public Boolean getIsUnlimitedQuota() {
        return this.isUnlimitedQuota;
    }

    public void setIsUnlimitedQuota(Boolean isUnlimitedQuota) {
        this.isUnlimitedQuota = isUnlimitedQuota;
    }

    public List<String> getModalities() {
        return this.modalities;
    }

    public void setModalities(List<String> modalities) {
        this.modalities = modalities;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getQuota() {
        return this.quota;
    }

    public void setQuota(String quota) {
        this.quota = quota;
    }
}
