from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_auth_wechat_mini import AdminAuthWechatMini
    from .admin_auth_wechat_official import AdminAuthWechatOfficial


@dataclass
class AdminAuthWechatSettings:
    """Admin auth wechat settings schema exposed by Claw Router."""
    mini: List[AdminAuthWechatMini]
    official: List[AdminAuthWechatOfficial]
