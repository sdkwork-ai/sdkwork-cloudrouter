from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminFirewallItem:
    """Persisted firewall rule snapshot returned by the backend."""
    id: str
    reason: str
    time: str
    type: str
    value: str
