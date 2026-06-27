package com.sdkwork.clawrouter.backend.model;


public class AdminAiResourceMemberItem {
    private String memberResourceCode;
    private String memberRole;
    private String parentResourceCode;
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

    public String getParentResourceCode() {
        return this.parentResourceCode;
    }

    public void setParentResourceCode(String parentResourceCode) {
        this.parentResourceCode = parentResourceCode;
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
