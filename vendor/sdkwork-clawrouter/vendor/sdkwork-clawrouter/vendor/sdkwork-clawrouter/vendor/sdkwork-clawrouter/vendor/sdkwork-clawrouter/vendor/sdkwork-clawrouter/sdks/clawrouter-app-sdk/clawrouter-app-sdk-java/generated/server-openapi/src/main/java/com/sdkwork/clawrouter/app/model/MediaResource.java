package com.sdkwork.clawrouter.app.model;

import java.util.List;
import java.util.Map;

public class MediaResource {
    private MediaAccess access;
    private MediaAiProvenance ai;
    private String altText;
    private String bucketId;
    private MediaChecksum checksum;
    private Double durationSeconds;
    private String fileName;
    private Integer height;
    private String id;
    private String kind;
    private Map<String, String> metadata;
    private String mimeType;
    private String objectBlobId;
    private String objectKey;
    private String objectVersion;
    private MediaResource poster;
    private String publicUrl;
    private String sizeBytes;
    private String source;
    private List<MediaResource> thumbnails;
    private String title;
    private String uri;
    private String url;
    private List<MediaResource> variants;
    private Integer width;

    public MediaAccess getAccess() {
        return this.access;
    }

    public void setAccess(MediaAccess access) {
        this.access = access;
    }

    public MediaAiProvenance getAi() {
        return this.ai;
    }

    public void setAi(MediaAiProvenance ai) {
        this.ai = ai;
    }

    public String getAltText() {
        return this.altText;
    }

    public void setAltText(String altText) {
        this.altText = altText;
    }

    public String getBucketId() {
        return this.bucketId;
    }

    public void setBucketId(String bucketId) {
        this.bucketId = bucketId;
    }

    public MediaChecksum getChecksum() {
        return this.checksum;
    }

    public void setChecksum(MediaChecksum checksum) {
        this.checksum = checksum;
    }

    public Double getDurationSeconds() {
        return this.durationSeconds;
    }

    public void setDurationSeconds(Double durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public String getFileName() {
        return this.fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public Integer getHeight() {
        return this.height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getKind() {
        return this.kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public Map<String, String> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public String getMimeType() {
        return this.mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public String getObjectBlobId() {
        return this.objectBlobId;
    }

    public void setObjectBlobId(String objectBlobId) {
        this.objectBlobId = objectBlobId;
    }

    public String getObjectKey() {
        return this.objectKey;
    }

    public void setObjectKey(String objectKey) {
        this.objectKey = objectKey;
    }

    public String getObjectVersion() {
        return this.objectVersion;
    }

    public void setObjectVersion(String objectVersion) {
        this.objectVersion = objectVersion;
    }

    public MediaResource getPoster() {
        return this.poster;
    }

    public void setPoster(MediaResource poster) {
        this.poster = poster;
    }

    public String getPublicUrl() {
        return this.publicUrl;
    }

    public void setPublicUrl(String publicUrl) {
        this.publicUrl = publicUrl;
    }

    public String getSizeBytes() {
        return this.sizeBytes;
    }

    public void setSizeBytes(String sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getSource() {
        return this.source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public List<MediaResource> getThumbnails() {
        return this.thumbnails;
    }

    public void setThumbnails(List<MediaResource> thumbnails) {
        this.thumbnails = thumbnails;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getUri() {
        return this.uri;
    }

    public void setUri(String uri) {
        this.uri = uri;
    }

    public String getUrl() {
        return this.url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public List<MediaResource> getVariants() {
        return this.variants;
    }

    public void setVariants(List<MediaResource> variants) {
        this.variants = variants;
    }

    public Integer getWidth() {
        return this.width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }
}
