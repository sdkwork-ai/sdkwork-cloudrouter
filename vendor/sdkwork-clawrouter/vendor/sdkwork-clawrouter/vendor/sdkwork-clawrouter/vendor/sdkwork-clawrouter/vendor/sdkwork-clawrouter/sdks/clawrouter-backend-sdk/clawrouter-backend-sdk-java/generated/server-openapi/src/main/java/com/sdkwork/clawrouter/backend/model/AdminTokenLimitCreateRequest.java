package com.sdkwork.clawrouter.backend.model;


public class AdminTokenLimitCreateRequest {
    private Integer burst;
    private String keyPrefix;
    private Integer rpd;
    private Integer rps;
    private String status;
    private String user;

    public Integer getBurst() {
        return this.burst;
    }

    public void setBurst(Integer burst) {
        this.burst = burst;
    }

    public String getKeyPrefix() {
        return this.keyPrefix;
    }

    public void setKeyPrefix(String keyPrefix) {
        this.keyPrefix = keyPrefix;
    }

    public Integer getRpd() {
        return this.rpd;
    }

    public void setRpd(Integer rpd) {
        this.rpd = rpd;
    }

    public Integer getRps() {
        return this.rps;
    }

    public void setRps(Integer rps) {
        this.rps = rps;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getUser() {
        return this.user;
    }

    public void setUser(String user) {
        this.user = user;
    }
}
