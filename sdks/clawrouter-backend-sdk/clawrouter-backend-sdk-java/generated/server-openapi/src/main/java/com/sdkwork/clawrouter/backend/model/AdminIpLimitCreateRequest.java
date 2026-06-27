package com.sdkwork.clawrouter.backend.model;


public class AdminIpLimitCreateRequest {
    private String blockDuration;
    private Integer rpm;
    private Integer rps;
    private String ruleName;
    private String status;
    private String targetIp;

    public String getBlockDuration() {
        return this.blockDuration;
    }

    public void setBlockDuration(String blockDuration) {
        this.blockDuration = blockDuration;
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
}
