package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAiResourceGroupCreateRequest {
    private String description;
    private String groupCode;
    private String groupName;
    private String groupType;
    private List<AdminAiResourceGroupMemberInput> members;
    private String selectionMode;
    private String sortOrder;
    private String status;

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getGroupCode() {
        return this.groupCode;
    }

    public void setGroupCode(String groupCode) {
        this.groupCode = groupCode;
    }

    public String getGroupName() {
        return this.groupName;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public String getGroupType() {
        return this.groupType;
    }

    public void setGroupType(String groupType) {
        this.groupType = groupType;
    }

    public List<AdminAiResourceGroupMemberInput> getMembers() {
        return this.members;
    }

    public void setMembers(List<AdminAiResourceGroupMemberInput> members) {
        this.members = members;
    }

    public String getSelectionMode() {
        return this.selectionMode;
    }

    public void setSelectionMode(String selectionMode) {
        this.selectionMode = selectionMode;
    }

    public String getSortOrder() {
        return this.sortOrder;
    }

    public void setSortOrder(String sortOrder) {
        this.sortOrder = sortOrder;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
