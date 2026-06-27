from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_auth_verification_policy import AdminAuthVerificationPolicy
    from .admin_auth_wechat_settings_update import AdminAuthWechatSettingsUpdate


@dataclass
class AdminAuthSettingsUpdateRequest:
    """Admin auth settings update request schema exposed by Claw Router."""
    left_rail_mode: Optional[str] = None
    login_methods: Optional[List[str]] = None
    oauth_login_enabled: Optional[bool] = None
    oauth_providers: Optional[List[str]] = None
    oauth_region: Optional[str] = None
    qr_login_enabled: Optional[bool] = None
    qr_login_type: Optional[str] = None
    recovery_methods: Optional[List[str]] = None
    register_methods: Optional[List[str]] = None
    verification_policy: Optional[AdminAuthVerificationPolicy] = None
    wechat: Optional[AdminAuthWechatSettingsUpdate] = None
