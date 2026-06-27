package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class VerificationPolicyUpdateRequest {
    private List<String> allowedChannels;
    private Integer codeLength;
    private String defaultChannel;
    private Integer maxSendPerHour;
    private Integer maxVerifyAttempts;
    private Integer resendIntervalSeconds;
    private Map<String, String> riskPolicy;
    private String templateCode;
    private Integer ttlSeconds;

    public List<String> getAllowedChannels() {
        return this.allowedChannels;
    }

    public void setAllowedChannels(List<String> allowedChannels) {
        this.allowedChannels = allowedChannels;
    }

    public Integer getCodeLength() {
        return this.codeLength;
    }

    public void setCodeLength(Integer codeLength) {
        this.codeLength = codeLength;
    }

    public String getDefaultChannel() {
        return this.defaultChannel;
    }

    public void setDefaultChannel(String defaultChannel) {
        this.defaultChannel = defaultChannel;
    }

    public Integer getMaxSendPerHour() {
        return this.maxSendPerHour;
    }

    public void setMaxSendPerHour(Integer maxSendPerHour) {
        this.maxSendPerHour = maxSendPerHour;
    }

    public Integer getMaxVerifyAttempts() {
        return this.maxVerifyAttempts;
    }

    public void setMaxVerifyAttempts(Integer maxVerifyAttempts) {
        this.maxVerifyAttempts = maxVerifyAttempts;
    }

    public Integer getResendIntervalSeconds() {
        return this.resendIntervalSeconds;
    }

    public void setResendIntervalSeconds(Integer resendIntervalSeconds) {
        this.resendIntervalSeconds = resendIntervalSeconds;
    }

    public Map<String, String> getRiskPolicy() {
        return this.riskPolicy;
    }

    public void setRiskPolicy(Map<String, String> riskPolicy) {
        this.riskPolicy = riskPolicy;
    }

    public String getTemplateCode() {
        return this.templateCode;
    }

    public void setTemplateCode(String templateCode) {
        this.templateCode = templateCode;
    }

    public Integer getTtlSeconds() {
        return this.ttlSeconds;
    }

    public void setTtlSeconds(Integer ttlSeconds) {
        this.ttlSeconds = ttlSeconds;
    }
}
