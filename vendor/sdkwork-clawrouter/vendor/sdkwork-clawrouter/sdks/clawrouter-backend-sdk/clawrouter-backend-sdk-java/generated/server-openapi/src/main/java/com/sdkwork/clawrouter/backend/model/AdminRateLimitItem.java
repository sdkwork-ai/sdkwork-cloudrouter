package com.sdkwork.clawrouter.backend.model;


public class AdminRateLimitItem {
    private String blockDuration;
    private Integer burst;
    private String channelGroup;
    private String channelGroupId;
    private String channelGroupName;
    private String id;
    private String keyPrefix;
    private String model;
    private Integer rpd;
    private Integer rpm;
    private Integer rps;
    private String ruleName;
    private String status;
    private String targetIp;
    private Integer tpm;
    private String user;

    public String getBlockDuration() {
        return this.blockDuration;
    }

    public void setBlockDuration(String blockDuration) {
        this.blockDuration = blockDuration;
    }

    public Integer getBurst() {
        return this.burst;
    }

    public void setBurst(Integer burst) {
        this.burst = burst;
    }

    public String getChannelGroup() {
        return this.channelGroup;
    }

    public void setChannelGroup(String channelGroup) {
        this.channelGroup = channelGroup;
    }

    public String getChannelGroupId() {
        return this.channelGroupId;
    }

    public void setChannelGroupId(String channelGroupId) {
        this.channelGroupId = channelGroupId;
    }

    public String getChannelGroupName() {
        return this.channelGroupName;
    }

    public void setChannelGroupName(String channelGroupName) {
        this.channelGroupName = channelGroupName;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getKeyPrefix() {
        return this.keyPrefix;
    }

    public void setKeyPrefix(String keyPrefix) {
        this.keyPrefix = keyPrefix;
    }

    public String getModel() {
        return this.model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Integer getRpd() {
        return this.rpd;
    }

    public void setRpd(Integer rpd) {
        this.rpd = rpd;
    }

    public Integer getRpm() {
        return this.rpm;
    }

    public void setRpm(Integer rpm) {
        this.rpm = rpm;
    }

    public Integer getRps() {
        return this.rps;
    }

    public void setRps(Integer rps) {
        this.rps = rps;
    }

    public String getRuleName() {
        return this.ruleName;
    }

    public void setRuleName(String ruleName) {
        this.ruleName = ruleName;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTargetIp() {
        return this.targetIp;
    }

    public void setTargetIp(String targetIp) {
        this.targetIp = targetIp;
    }

    public Integer getTpm() {
        return this.tpm;
    }

    public void setTpm(Integer tpm) {
        this.tpm = tpm;
    }

    public String getUser() {
        return this.user;
    }

    public void setUser(String user) {
        this.user = user;
    }
}
