use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PaasCapability {
    Ocr,
    FaceCompare,
    FaceLivenessVerification,
    DocumentIntelligence,
    CertificateInvoice,
    SpeechRecognition,
    ContentModeration,
    AddressLogistics,
    NotificationMessaging,
    ObjectStorage,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum PaasOperation {
    OcrGeneralText,
    OcrDocumentText,
    OcrIdCard,
    OcrBankCard,
    OcrBusinessLicense,
    OcrInvoice,
    FaceCompareOneToOne,
    FaceCompareOneToMany,
    FaceCompareQualityCheck,
    FaceLivenessDetection,
    FaceLivenessIdVerification,
    FaceLivenessVideo,
    DocumentLayoutAnalysis,
    DocumentTableExtraction,
    DocumentKeyValueExtraction,
    DocumentParse,
    CertificateIdCard,
    CertificatePassport,
    CertificateDriverLicense,
    CertificateBusinessLicense,
    CertificateVatInvoice,
    CertificateReceipt,
    SpeechAsrShortAudio,
    SpeechRecordingFile,
    SpeechRealtimeAsr,
    ContentTextModeration,
    ContentImageModeration,
    ContentAudioModeration,
    ContentVideoModeration,
    AddressParse,
    PhoneAttribution,
    ExpressTrack,
    LogisticsStatus,
    SmsSend,
    SmsTemplate,
    OtpSend,
    DeliveryReceipt,
    ObjectStorageUpload,
    ObjectStorageSignedUrl,
    ObjectStorageBucketPolicy,
    ObjectStorageLifecycleRule,
}

impl PaasOperation {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::OcrGeneralText => "ocr.general_text",
            Self::OcrDocumentText => "ocr.document_text",
            Self::OcrIdCard => "ocr.id_card",
            Self::OcrBankCard => "ocr.bank_card",
            Self::OcrBusinessLicense => "ocr.business_license",
            Self::OcrInvoice => "ocr.invoice",
            Self::FaceCompareOneToOne => "face.compare.one_to_one",
            Self::FaceCompareOneToMany => "face.compare.one_to_many",
            Self::FaceCompareQualityCheck => "face.compare.quality_check",
            Self::FaceLivenessDetection => "face.liveness.detection",
            Self::FaceLivenessIdVerification => "face.liveness.id_verification",
            Self::FaceLivenessVideo => "face.liveness.video",
            Self::DocumentLayoutAnalysis => "document.layout_analysis",
            Self::DocumentTableExtraction => "document.table_extraction",
            Self::DocumentKeyValueExtraction => "document.key_value_extraction",
            Self::DocumentParse => "document.parse",
            Self::CertificateIdCard => "certificate.id_card",
            Self::CertificatePassport => "certificate.passport",
            Self::CertificateDriverLicense => "certificate.driver_license",
            Self::CertificateBusinessLicense => "certificate.business_license",
            Self::CertificateVatInvoice => "certificate.vat_invoice",
            Self::CertificateReceipt => "certificate.receipt",
            Self::SpeechAsrShortAudio => "speech.asr_short_audio",
            Self::SpeechRecordingFile => "speech.recording_file",
            Self::SpeechRealtimeAsr => "speech.realtime_asr",
            Self::ContentTextModeration => "content.text_moderation",
            Self::ContentImageModeration => "content.image_moderation",
            Self::ContentAudioModeration => "content.audio_moderation",
            Self::ContentVideoModeration => "content.video_moderation",
            Self::AddressParse => "address.parse",
            Self::PhoneAttribution => "phone.attribution",
            Self::ExpressTrack => "express.track",
            Self::LogisticsStatus => "logistics.status",
            Self::SmsSend => "notification.sms_send",
            Self::SmsTemplate => "notification.sms_template",
            Self::OtpSend => "notification.otp_send",
            Self::DeliveryReceipt => "notification.delivery_receipt",
            Self::ObjectStorageUpload => "object_storage.upload",
            Self::ObjectStorageSignedUrl => "object_storage.signed_url",
            Self::ObjectStorageBucketPolicy => "object_storage.bucket_policy",
            Self::ObjectStorageLifecycleRule => "object_storage.lifecycle_rule",
        }
    }
}

impl Serialize for PaasOperation {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.as_str())
    }
}

impl<'de> Deserialize<'de> for PaasOperation {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        value
            .parse()
            .map_err(|_| serde::de::Error::custom(format!("unknown PaaS operation: {value}")))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PaasOperationParseError;

impl FromStr for PaasOperation {
    type Err = PaasOperationParseError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        paas_operation_from_str(value).ok_or(PaasOperationParseError)
    }
}

impl PaasOperation {
    #[allow(clippy::should_implement_trait)]
    pub fn from_str(value: &str) -> Option<Self> {
        paas_operation_from_str(value)
    }
}

fn paas_operation_from_str(value: &str) -> Option<PaasOperation> {
    Some(match value {
        "ocr.general_text" => PaasOperation::OcrGeneralText,
        "ocr.document_text" => PaasOperation::OcrDocumentText,
        "ocr.id_card" => PaasOperation::OcrIdCard,
        "ocr.bank_card" => PaasOperation::OcrBankCard,
        "ocr.business_license" => PaasOperation::OcrBusinessLicense,
        "ocr.invoice" => PaasOperation::OcrInvoice,
        "face.compare.one_to_one" => PaasOperation::FaceCompareOneToOne,
        "face.compare.one_to_many" => PaasOperation::FaceCompareOneToMany,
        "face.compare.quality_check" => PaasOperation::FaceCompareQualityCheck,
        "face.liveness.detection" => PaasOperation::FaceLivenessDetection,
        "face.liveness.id_verification" => PaasOperation::FaceLivenessIdVerification,
        "face.liveness.video" => PaasOperation::FaceLivenessVideo,
        "document.layout_analysis" => PaasOperation::DocumentLayoutAnalysis,
        "document.table_extraction" => PaasOperation::DocumentTableExtraction,
        "document.key_value_extraction" => PaasOperation::DocumentKeyValueExtraction,
        "document.parse" => PaasOperation::DocumentParse,
        "certificate.id_card" => PaasOperation::CertificateIdCard,
        "certificate.passport" => PaasOperation::CertificatePassport,
        "certificate.driver_license" => PaasOperation::CertificateDriverLicense,
        "certificate.business_license" => PaasOperation::CertificateBusinessLicense,
        "certificate.vat_invoice" => PaasOperation::CertificateVatInvoice,
        "certificate.receipt" => PaasOperation::CertificateReceipt,
        "speech.asr_short_audio" => PaasOperation::SpeechAsrShortAudio,
        "speech.recording_file" => PaasOperation::SpeechRecordingFile,
        "speech.realtime_asr" => PaasOperation::SpeechRealtimeAsr,
        "content.text_moderation" => PaasOperation::ContentTextModeration,
        "content.image_moderation" => PaasOperation::ContentImageModeration,
        "content.audio_moderation" => PaasOperation::ContentAudioModeration,
        "content.video_moderation" => PaasOperation::ContentVideoModeration,
        "address.parse" => PaasOperation::AddressParse,
        "phone.attribution" => PaasOperation::PhoneAttribution,
        "express.track" => PaasOperation::ExpressTrack,
        "logistics.status" => PaasOperation::LogisticsStatus,
        "notification.sms_send" => PaasOperation::SmsSend,
        "notification.sms_template" => PaasOperation::SmsTemplate,
        "notification.otp_send" => PaasOperation::OtpSend,
        "notification.delivery_receipt" => PaasOperation::DeliveryReceipt,
        "object_storage.upload" => PaasOperation::ObjectStorageUpload,
        "object_storage.signed_url" => PaasOperation::ObjectStorageSignedUrl,
        "object_storage.bucket_policy" => PaasOperation::ObjectStorageBucketPolicy,
        "object_storage.lifecycle_rule" => PaasOperation::ObjectStorageLifecycleRule,
        _ => return None,
    })
}
