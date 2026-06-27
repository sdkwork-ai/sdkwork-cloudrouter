from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminFirewallRuleCreateRequest:
    """Admin firewall rule create request schema exposed by Claw Router."""
    reason: str
    type: str
    value: str
