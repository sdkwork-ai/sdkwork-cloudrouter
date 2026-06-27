from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DashboardConfigurationDomain:
    """Dashboard configuration domain schema exposed by Claw Router."""
    domain: str
    id: str
    ip: str
    name: str
    remark: str
    status: str
