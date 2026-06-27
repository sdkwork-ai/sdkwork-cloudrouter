package com.sdkwork.clawrouter.backend.model;


public class AdminChannelTestResponse {
    private String channelId;
    private AdminChannelItem item;
    private String latency;
    private String status;
    private Boolean success;

    public String getChannelId() {
        return this.channelId;
    }

    public void setChannelId(String channelId) {
        this.channelId = channelId;
    }

    public AdminChannelItem getItem() {
        return this.item;
    }

    public void setItem(AdminChannelItem item) {
        this.item = item;
    }

    public String getLatency() {
        return this.latency;
    }

    public void setLatency(String latency) {
        this.latency = latency;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Boolean getSuccess() {
        return this.success;
    }

    public void setSuccess(Boolean success) {
        this.success = success;
    }
}
