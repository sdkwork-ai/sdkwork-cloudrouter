from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminProviderSecretCreateRequest:
    """Admin provider secret create request schema exposed by Claw Router."""
    name: str
    provider_code: str
    secret_ref: str
    auth_type: Optional[str] = None
    status: Optional[str] = None
