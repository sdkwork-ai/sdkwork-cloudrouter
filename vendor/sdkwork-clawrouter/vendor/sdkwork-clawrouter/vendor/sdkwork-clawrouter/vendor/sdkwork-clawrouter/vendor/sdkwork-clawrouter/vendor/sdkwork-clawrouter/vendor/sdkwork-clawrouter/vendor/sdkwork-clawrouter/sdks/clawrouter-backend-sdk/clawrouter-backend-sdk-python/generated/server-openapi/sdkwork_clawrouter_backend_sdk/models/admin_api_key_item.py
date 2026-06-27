from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminApiKeyItem:
    """Persisted masked API key snapshot returned by the backend."""
    id: str
    key: str
    name: str
    status: str
    used: str
