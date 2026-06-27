from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminModelMappingResolveRequest:
    """Admin model mapping resolve request schema exposed by Claw Router."""
    source_model: str
    channel_code: Optional[str] = None
    channel_id: Optional[str] = None
    provider_account_code: Optional[str] = None
    provider_account_id: Optional[str] = None
    vendor_code: Optional[str] = None
