package com.sdkwork.clawrouter.backend

data class MediaResource(
    val access: MediaAccess? = null,
    val ai: MediaAiProvenance? = null,
    val altText: String? = null,
    val bucketId: String? = null,
    val checksum: MediaChecksum? = null,
    val durationSeconds: Double? = null,
    val fileName: String? = null,
    val height: Int? = null,
    val id: String? = null,
    val kind: String? = null,
    val metadata: Map<String, String>? = null,
    val mimeType: String? = null,
    val objectBlobId: String? = null,
    val objectKey: String? = null,
    val objectVersion: String? = null,
    val poster: MediaResource? = null,
    val publicUrl: String? = null,
    val sizeBytes: String? = null,
    val source: String? = null,
    val thumbnails: List<MediaResource>? = null,
    val title: String? = null,
    val uri: String? = null,
    val url: String? = null,
    val variants: List<MediaResource>? = null,
    val width: Int? = null
)
