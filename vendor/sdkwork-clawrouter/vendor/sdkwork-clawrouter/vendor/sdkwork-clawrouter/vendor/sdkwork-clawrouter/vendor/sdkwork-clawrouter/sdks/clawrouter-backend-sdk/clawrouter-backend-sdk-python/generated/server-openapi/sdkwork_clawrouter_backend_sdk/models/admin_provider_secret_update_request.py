from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminProviderSecretUpdateRequest:
    """Admin provider secret update request schema exposed by Claw Router."""
    id: str
    auth_type: Optional[str] = None
    name: Optional[str] = None
    provider_code: Optional[str] = None
    secret_ref: Optional[str] = None
    status: Optional[str] = None
