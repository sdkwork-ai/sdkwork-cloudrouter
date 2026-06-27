from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiOrganizationAdminApiKeyCreateRequest:
    """OpenAI-compatible request to create an organization admin API key."""
    name: str
