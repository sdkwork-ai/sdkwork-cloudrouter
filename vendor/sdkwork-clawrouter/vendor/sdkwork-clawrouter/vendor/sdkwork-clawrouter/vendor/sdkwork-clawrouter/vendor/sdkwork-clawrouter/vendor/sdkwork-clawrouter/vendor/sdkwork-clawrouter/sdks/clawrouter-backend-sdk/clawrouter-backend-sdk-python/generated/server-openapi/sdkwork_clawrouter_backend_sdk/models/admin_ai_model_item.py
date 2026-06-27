from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_model_region_price import AdminAiModelRegionPrice


@dataclass
class AdminAiModelItem:
    """Persisted ai model snapshot returned by the backend."""
    api_format: Optional[str]
    calls: str
    capability_intro: Optional[str]
    context_tokens: Optional[str]
    description: Optional[str]
    display_name: str
    id: str
    input_modalities: List[str]
    limitations: List[str]
    max_output_tokens: Optional[str]
    modalities: List[str]
    model: str
    name: str
    output_modalities: List[str]
    region_prices: List[AdminAiModelRegionPrice]
    release_stage: Optional[str]
    replacement_model: Optional[str]
    routing_state: Optional[str]
    shelf_state: Optional[str]
    status: str
    supported_languages: List[str]
    supports_json_schema: bool
    supports_streaming: bool
    supports_tools: bool
    training_data_cutoff: Optional[str]
    type: str
    use_cases: List[str]
    vendor_code: str
    vendor_id: str
