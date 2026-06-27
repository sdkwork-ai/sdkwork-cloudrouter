from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DeleteApiKeyResponse:
    """Delete api key response schema exposed by Claw Router."""
    deleted: bool
    id: str
