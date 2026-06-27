package com.sdkwork.clawrouter.backend.model;


public class AdminAiResourceMemberInput {
    private String memberResourceCode;
    private String memberRole;
    private Boolean required;
    private String sortOrder;

    public String getMemberResourceCode() {
        return this.memberResourceCode;
    }

    public void setMemberResourceCode(String memberResourceCode) {
        this.memberResourceCode = memberResourceCode;
    }

    public String getMemberRole() {
        return this.memberRole;
    }

    public void setMemberRole(String memberRole) {
        this.memberRole = memberRole;
    }

    public Boolean getRequired() {
        return this.required;
    }

    public void setRequired(Boolean required) {
        this.required = required;
    }

    public String getSortOrder() {
        return this.sortOrder;
    }

    public void setSortOrder(String sortOrder) {
        this.sortOrder = sortOrder;
    }
}
