from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_model_region_price import AdminAiModelRegionPrice


@dataclass
class AdminAiModelUpdateRequest:
    """Admin ai model update request schema exposed by Claw Router."""
    api_format: Optional[str] = None
    capability_intro: Optional[str] = None
    context_tokens: Optional[str] = None
    description: Optional[str] = None
    display_name: Optional[str] = None
    input_modalities: Optional[List[str]] = None
    limitations: Optional[List[str]] = None
    max_output_tokens: Optional[str] = None
    modalities: Optional[List[str]] = None
    model: Optional[str] = None
    output_modalities: Optional[List[str]] = None
    region_prices: Optional[List[AdminAiModelRegionPrice]] = None
    release_stage: Optional[str] = None
    replacement_model: Optional[str] = None
    routing_state: Optional[str] = None
    shelf_state: Optional[str] = None
    status: Optional[str] = None
    supported_languages: Optional[List[str]] = None
    supports_json_schema: Optional[bool] = None
    supports_streaming: Optional[bool] = None
    supports_tools: Optional[bool] = None
    training_data_cutoff: Optional[str] = None
    type: Optional[str] = None
    use_cases: Optional[List[str]] = None
    vendor_id: Optional[str] = None
