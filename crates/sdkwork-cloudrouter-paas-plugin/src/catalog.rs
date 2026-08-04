use crate::operation::{PaasCapability, PaasOperation};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaasServiceGroup {
    pub code: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub capability: PaasCapability,
    pub supplier_codes: Vec<&'static str>,
    pub operations: Vec<&'static str>,
    pub standard_operations: Vec<PaasOperation>,
}

pub fn standard_paas_service_groups() -> Vec<PaasServiceGroup> {
    vec![
        service_group(
            "ocr",
            "OCR识别",
            "Unified text, document, certificate, and invoice OCR across Baidu, Alibaba Cloud, and Tencent Cloud.",
            PaasCapability::Ocr,
            vec![
                ("general_text", PaasOperation::OcrGeneralText),
                ("document_text", PaasOperation::OcrDocumentText),
                ("id_card", PaasOperation::OcrIdCard),
                ("bank_card", PaasOperation::OcrBankCard),
                ("business_license", PaasOperation::OcrBusinessLicense),
                ("invoice", PaasOperation::OcrInvoice),
            ],
        ),
        service_group(
            "face_compare",
            "人脸比对",
            "Unified one-to-one and one-to-many face comparison with image quality checks.",
            PaasCapability::FaceCompare,
            vec![
                ("one_to_one", PaasOperation::FaceCompareOneToOne),
                ("one_to_many", PaasOperation::FaceCompareOneToMany),
                ("quality_check", PaasOperation::FaceCompareQualityCheck),
            ],
        ),
        service_group(
            "face_liveness_verification",
            "人脸核身",
            "Unified liveness, identity, and video verification flows for real-name checks.",
            PaasCapability::FaceLivenessVerification,
            vec![
                ("liveness_detection", PaasOperation::FaceLivenessDetection),
                ("id_verification", PaasOperation::FaceLivenessIdVerification),
                ("video_liveness", PaasOperation::FaceLivenessVideo),
            ],
        ),
        service_group(
            "document_intelligence",
            "文档智能",
            "Document parsing, table extraction, layout analysis, and key-value extraction.",
            PaasCapability::DocumentIntelligence,
            vec![
                ("layout_analysis", PaasOperation::DocumentLayoutAnalysis),
                ("table_extraction", PaasOperation::DocumentTableExtraction),
                ("key_value_extraction", PaasOperation::DocumentKeyValueExtraction),
                ("document_parse", PaasOperation::DocumentParse),
            ],
        ),
        service_group(
            "certificate_invoice",
            "票据证照",
            "Certificate, license, invoice, receipt, and bank card structured recognition.",
            PaasCapability::CertificateInvoice,
            vec![
                ("id_card", PaasOperation::CertificateIdCard),
                ("passport", PaasOperation::CertificatePassport),
                ("driver_license", PaasOperation::CertificateDriverLicense),
                (
                    "business_license",
                    PaasOperation::CertificateBusinessLicense,
                ),
                ("vat_invoice", PaasOperation::CertificateVatInvoice),
                ("receipt", PaasOperation::CertificateReceipt),
            ],
        ),
        service_group(
            "speech_recognition",
            "语音识别",
            "Speech-to-text, recording transcription, and realtime audio recognition.",
            PaasCapability::SpeechRecognition,
            vec![
                ("asr_short_audio", PaasOperation::SpeechAsrShortAudio),
                ("recording_file", PaasOperation::SpeechRecordingFile),
                ("realtime_asr", PaasOperation::SpeechRealtimeAsr),
            ],
        ),
        service_group(
            "content_moderation",
            "内容安全",
            "Text, image, audio, and video content moderation across cloud providers.",
            PaasCapability::ContentModeration,
            vec![
                ("text_moderation", PaasOperation::ContentTextModeration),
                ("image_moderation", PaasOperation::ContentImageModeration),
                ("audio_moderation", PaasOperation::ContentAudioModeration),
                ("video_moderation", PaasOperation::ContentVideoModeration),
            ],
        ),
        service_group(
            "address_logistics",
            "地址物流",
            "Address parsing, phone attribution, express tracking, and logistics status queries.",
            PaasCapability::AddressLogistics,
            vec![
                ("address_parse", PaasOperation::AddressParse),
                ("phone_attribution", PaasOperation::PhoneAttribution),
                ("express_track", PaasOperation::ExpressTrack),
                ("logistics_status", PaasOperation::LogisticsStatus),
            ],
        ),
        service_group(
            "notification_messaging",
            "短信通知",
            "SMS, template message, and one-time password delivery aggregation.",
            PaasCapability::NotificationMessaging,
            vec![
                ("sms_send", PaasOperation::SmsSend),
                ("sms_template", PaasOperation::SmsTemplate),
                ("otp_send", PaasOperation::OtpSend),
                ("delivery_receipt", PaasOperation::DeliveryReceipt),
            ],
        ),
        service_group(
            "object_storage",
            "对象存储",
            "Object storage upload, signed URL, bucket policy, and lifecycle aggregation.",
            PaasCapability::ObjectStorage,
            vec![
                ("object_upload", PaasOperation::ObjectStorageUpload),
                ("signed_url", PaasOperation::ObjectStorageSignedUrl),
                ("bucket_policy", PaasOperation::ObjectStorageBucketPolicy),
                ("lifecycle_rule", PaasOperation::ObjectStorageLifecycleRule),
            ],
        ),
    ]
}

fn service_group(
    code: &'static str,
    name: &'static str,
    description: &'static str,
    capability: PaasCapability,
    operations: Vec<(&'static str, PaasOperation)>,
) -> PaasServiceGroup {
    PaasServiceGroup {
        code,
        name,
        description,
        capability,
        supplier_codes: vec!["baidu", "alibaba", "tencent"],
        operations: operations.iter().map(|(code, _)| *code).collect(),
        standard_operations: operations
            .into_iter()
            .map(|(_, operation)| operation)
            .collect(),
    }
}
