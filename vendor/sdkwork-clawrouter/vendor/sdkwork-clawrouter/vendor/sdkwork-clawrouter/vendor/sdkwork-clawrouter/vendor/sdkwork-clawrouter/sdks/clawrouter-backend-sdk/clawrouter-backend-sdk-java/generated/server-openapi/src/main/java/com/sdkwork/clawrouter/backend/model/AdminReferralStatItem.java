package com.sdkwork.clawrouter.backend.model;


public class AdminReferralStatItem {
    private String bonusAwarded;
    private String id;
    private String inviter;
    private String link;
    private String totalInvited;
    private String totalRevenue;

    public String getBonusAwarded() {
        return this.bonusAwarded;
    }

    public void setBonusAwarded(String bonusAwarded) {
        this.bonusAwarded = bonusAwarded;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getInviter() {
        return this.inviter;
    }

    public void setInviter(String inviter) {
        this.inviter = inviter;
    }

    public String getLink() {
        return this.link;
    }

    public void setLink(String link) {
        this.link = link;
    }

    public String getTotalInvited() {
        return this.totalInvited;
    }

    public void setTotalInvited(String totalInvited) {
        this.totalInvited = totalInvited;
    }

    public String getTotalRevenue() {
        return this.totalRevenue;
    }

    public void setTotalRevenue(String totalRevenue) {
        this.totalRevenue = totalRevenue;
    }
}
