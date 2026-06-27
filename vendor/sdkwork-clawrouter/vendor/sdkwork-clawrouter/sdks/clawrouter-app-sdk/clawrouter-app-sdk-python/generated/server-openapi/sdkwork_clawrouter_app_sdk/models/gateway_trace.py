from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GatewayTrace:
    """Gateway trace schema exposed by Claw Router."""
    channel: str
    duration: str
    endpoint: str
    id: str
    ip: str
    method: str
    status: int
    time: str
