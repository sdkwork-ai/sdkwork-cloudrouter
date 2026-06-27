from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAuthWechatOfficial:
    """Admin auth wechat official schema exposed by Claw Router."""
    app_id: str
    enabled: bool
    key: str
    name: str
    primary: bool
    secret_ref: str
    token_ref: str
    aes_key_ref: Optional[str] = None
    original_id: Optional[str] = None
    scene: Optional[str] = None
    url: Optional[str] = None
