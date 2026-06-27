from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAuthWechatMini:
    """Admin auth wechat mini schema exposed by Claw Router."""
    app_id: str
    enabled: bool
    env: str
    key: str
    name: str
    path: str
    primary: bool
    secret_ref: str
    url: Optional[str] = None
