from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminApiKeyCreateRequest:
    """Admin api key create request schema exposed by Claw Router."""
    name: str
    user_id: str
