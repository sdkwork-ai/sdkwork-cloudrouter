package com.sdkwork.clawrouter.backend.model;


public class MessagingSuppressionCreateRequest {
    private String channel;
    private String endsAt;
    private String note;
    private String reasonCode;
    private String scopeId;
    private String scopeType;
    private String source;
    private String startsAt;
    private String targetHash;
    private String targetMasked;

    public String getChannel() {
        return this.channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getEndsAt() {
        return this.endsAt;
    }

    public void setEndsAt(String endsAt) {
        this.endsAt = endsAt;
    }

    public String getNote() {
        return this.note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getReasonCode() {
        return this.reasonCode;
    }

    public void setReasonCode(String reasonCode) {
        this.reasonCode = reasonCode;
    }

    public String getScopeId() {
        return this.scopeId;
    }

    public void setScopeId(String scopeId) {
        this.scopeId = scopeId;
    }

    public String getScopeType() {
        return this.scopeType;
    }

    public void setScopeType(String scopeType) {
        this.scopeType = scopeType;
    }

    public String getSource() {
        return this.source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getStartsAt() {
        return this.startsAt;
    }

    public void setStartsAt(String startsAt) {
        this.startsAt = startsAt;
    }

    public String getTargetHash() {
        return this.targetHash;
    }

    public void setTargetHash(String targetHash) {
        this.targetHash = targetHash;
    }

    public String getTargetMasked() {
        return this.targetMasked;
    }

    public void setTargetMasked(String targetMasked) {
        this.targetMasked = targetMasked;
    }
}
