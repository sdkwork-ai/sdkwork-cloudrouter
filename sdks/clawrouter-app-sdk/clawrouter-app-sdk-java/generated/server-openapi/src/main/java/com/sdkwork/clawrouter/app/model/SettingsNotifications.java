package com.sdkwork.clawrouter.app.model;


public class SettingsNotifications {
    private Boolean apiMonitor;
    private Boolean billReminder;
    private Boolean quotaWarning;

    public Boolean getApiMonitor() {
        return this.apiMonitor;
    }

    public void setApiMonitor(Boolean apiMonitor) {
        this.apiMonitor = apiMonitor;
    }

    public Boolean getBillReminder() {
        return this.billReminder;
    }

    public void setBillReminder(Boolean billReminder) {
        this.billReminder = billReminder;
    }

    public Boolean getQuotaWarning() {
        return this.quotaWarning;
    }

    public void setQuotaWarning(Boolean quotaWarning) {
        this.quotaWarning = quotaWarning;
    }
}
