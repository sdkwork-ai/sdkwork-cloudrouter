from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_organization_admin_api_key import OpenAiOrganizationAdminApiKey


@dataclass
class OpenAiOrganizationAdminApiKeyList:
    """OpenAI-compatible paginated list of organization admin API keys."""
    data: List[OpenAiOrganizationAdminApiKey]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
