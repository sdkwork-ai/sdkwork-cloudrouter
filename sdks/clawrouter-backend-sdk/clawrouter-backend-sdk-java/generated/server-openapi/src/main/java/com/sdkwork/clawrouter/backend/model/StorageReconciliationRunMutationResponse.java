package com.sdkwork.clawrouter.backend.model;


public class StorageReconciliationRunMutationResponse {
    private StorageReconciliationRun reconciliationRun;
    private String requestId;

    public StorageReconciliationRun getReconciliationRun() {
        return this.reconciliationRun;
    }

    public void setReconciliationRun(StorageReconciliationRun reconciliationRun) {
        this.reconciliationRun = reconciliationRun;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}
