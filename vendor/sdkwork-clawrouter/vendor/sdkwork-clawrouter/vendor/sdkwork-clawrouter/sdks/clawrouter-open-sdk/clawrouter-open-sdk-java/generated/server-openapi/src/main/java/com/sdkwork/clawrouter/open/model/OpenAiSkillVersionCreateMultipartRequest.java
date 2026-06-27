package com.sdkwork.clawrouter.open.model;


public class OpenAiSkillVersionCreateMultipartRequest {
    private String file;
    private String metadata;
    private String name;
    private String package_;

    public String getFile() {
        return this.file;
    }

    public void setFile(String file) {
        this.file = file;
    }

    public String getMetadata() {
        return this.metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPackage_() {
        return this.package_;
    }

    public void setPackage_(String package_) {
        this.package_ = package_;
    }
}
