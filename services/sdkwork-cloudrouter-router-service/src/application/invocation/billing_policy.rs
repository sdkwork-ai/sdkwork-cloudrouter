use super::{
    BillingMode, BillingQuantitySource, Invocation, InvocationBilling, InvocationFuture,
    InvocationInterceptor, InvocationShape, InvocationSurface, ResourceType,
};
use crate::domain::{AiRouteModelRequirement, BillingMeter, RoutingCapability};

#[derive(Debug, Clone, Default)]
pub struct BillingPolicyInterceptor;

impl InvocationInterceptor for BillingPolicyInterceptor {
    fn name(&self) -> &str {
        "billing_policy"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            invocation.billing = billing_policy_for(invocation);
            Ok(())
        })
    }
}

fn billing_policy_for(invocation: &Invocation) -> InvocationBilling {
    if invocation.resource.resource_type == ResourceType::FreeEndpoint {
        return InvocationBilling::free();
    }

    match invocation.resource.surface {
        InvocationSurface::ProviderNative => {
            if matches!(
                invocation.dispatch.invocation_shape,
                InvocationShape::SseStream
            ) {
                // Provider-native SSE streaming — use composite token billing
                streaming_composite_policy(
                    invocation
                        .billing
                        .meter
                        .clone()
                        .unwrap_or(BillingMeter::LlmInputToken),
                )
            } else {
                InvocationBilling {
                    mode: BillingMode::ExternalUsageLine,
                    meter: invocation.billing.meter.clone(),
                    quantity_source: BillingQuantitySource::FixedRequest,
                    pricing_required: true,
                    settlement_required: true,
                    prepaid_required: false,
                }
            }
        }
        InvocationSurface::OpenAiCompatible => openai_compatible_policy(invocation),
        InvocationSurface::CloudStorage => storage_policy(invocation),
        InvocationSurface::CloudIaas => api_request_policy(),
        InvocationSurface::AppApi | InvocationSurface::AdminApi | InvocationSurface::Internal => {
            InvocationBilling::free()
        }
    }
}

fn openai_compatible_policy(invocation: &Invocation) -> InvocationBilling {
    if invocation.resource.model_requirement == AiRouteModelRequirement::Ignored {
        return api_request_policy();
    }
    openai_compatible_policy_by_resource_type(invocation)
}

fn openai_compatible_policy_by_resource_type(invocation: &Invocation) -> InvocationBilling {
    match invocation.resource.resource_type {
        ResourceType::FreeEndpoint => InvocationBilling::free(),
        ResourceType::ChatCompletion
        | ResourceType::Response
        | ResourceType::Thread
        | ResourceType::RealtimeSession => {
            if optional_model_absent(invocation) {
                api_request_policy()
            } else {
                model_composite_policy(invocation, BillingMeter::LlmInputToken)
            }
        }
        ResourceType::Embedding => InvocationBilling {
            mode: BillingMode::Token,
            meter: Some(BillingMeter::EmbeddingInputToken),
            quantity_source: BillingQuantitySource::ResponseBody,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        },
        ResourceType::Image => result_policy(BillingMeter::ImageResult),
        ResourceType::Audio => audio_policy(invocation),
        ResourceType::Video => result_policy(BillingMeter::VideoResult),
        ResourceType::ModelCall => match invocation.resource.capability {
            RoutingCapability::Chat => {
                model_composite_policy(invocation, BillingMeter::LlmInputToken)
            }
            RoutingCapability::Embedding => single_token_policy(BillingMeter::EmbeddingInputToken),
            RoutingCapability::Image => result_policy(BillingMeter::ImageResult),
            RoutingCapability::Audio => duration_policy(BillingMeter::AudioInputSecond),
            RoutingCapability::Music => duration_policy(BillingMeter::MusicOutputSecond),
            RoutingCapability::Video => result_policy(BillingMeter::VideoResult),
            RoutingCapability::Rerank => item_policy(BillingMeter::RerankDocument),
            RoutingCapability::Network => api_request_policy(),
        },
        ResourceType::ProviderNativeApi => InvocationBilling {
            mode: BillingMode::ExternalUsageLine,
            meter: None,
            quantity_source: BillingQuantitySource::AdapterUsageLines,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        },
        ResourceType::File
        | ResourceType::Upload
        | ResourceType::Assistant
        | ResourceType::VectorStore
        | ResourceType::Batch
        | ResourceType::FineTuningJob
        | ResourceType::Conversation
        | ResourceType::Container
        | ResourceType::StorageBucket
        | ResourceType::StorageObject
        | ResourceType::IaasInstance
        | ResourceType::Unknown => {
            if optional_model_present(invocation) {
                model_composite_policy(invocation, BillingMeter::LlmInputToken)
            } else {
                api_request_policy()
            }
        }
    }
}

fn optional_model_absent(invocation: &Invocation) -> bool {
    invocation.resource.model_requirement == AiRouteModelRequirement::Optional
        && !optional_model_present(invocation)
}

fn optional_model_present(invocation: &Invocation) -> bool {
    invocation
        .resource
        .requested_model
        .as_deref()
        .map(str::trim)
        .is_some_and(|value| !value.is_empty())
}

fn api_request_policy() -> InvocationBilling {
    InvocationBilling::api_request(BillingMeter::ApiRequest)
}

fn composite_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling::composite(meter)
}

fn streaming_composite_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling {
        quantity_source: BillingQuantitySource::StreamingAccumulator,
        ..InvocationBilling::composite(meter)
    }
}

fn model_composite_policy(invocation: &Invocation, meter: BillingMeter) -> InvocationBilling {
    if matches!(
        invocation.dispatch.invocation_shape,
        InvocationShape::SseStream
    ) {
        streaming_composite_policy(meter)
    } else {
        composite_policy(meter)
    }
}

fn single_token_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling {
        mode: BillingMode::Token,
        meter: Some(meter),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    }
}

fn result_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling {
        mode: BillingMode::ResultCount,
        meter: Some(meter),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    }
}

fn item_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling {
        mode: BillingMode::ItemCount,
        meter: Some(meter),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    }
}

fn audio_policy(invocation: &Invocation) -> InvocationBilling {
    match invocation.billing.meter.clone() {
        Some(BillingMeter::TtsInputCharacter) | Some(BillingMeter::SpeechCharacter) => {
            character_policy(invocation.billing.meter.clone().unwrap())
        }
        Some(BillingMeter::AudioInputSecond)
        | Some(BillingMeter::AudioOutputSecond)
        | Some(BillingMeter::AudioInputMinute)
        | Some(BillingMeter::AudioOutputMinute)
        | Some(BillingMeter::SttAudioMinute) => {
            duration_policy(invocation.billing.meter.clone().unwrap())
        }
        Some(meter) => duration_policy(meter),
        None => duration_policy(BillingMeter::AudioInputSecond),
    }
}

fn character_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling {
        mode: BillingMode::Character,
        meter: Some(meter),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    }
}

fn duration_policy(meter: BillingMeter) -> InvocationBilling {
    InvocationBilling {
        mode: BillingMode::AudioSecond,
        meter: Some(meter),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    }
}

fn storage_policy(invocation: &Invocation) -> InvocationBilling {
    match invocation.resource.resource_type {
        ResourceType::StorageBucket | ResourceType::StorageObject => InvocationBilling {
            mode: BillingMode::Storage,
            meter: Some(BillingMeter::StorageGbDay),
            quantity_source: BillingQuantitySource::ResponseBody,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        },
        _ => api_request_policy(),
    }
}
