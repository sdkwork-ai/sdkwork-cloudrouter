from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_organization_cost_bucket import OpenAiOrganizationCostBucket


@dataclass
class OpenAiOrganizationCostList:
    """OpenAI-compatible paginated list of organization cost buckets."""
    data: List[OpenAiOrganizationCostBucket]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
