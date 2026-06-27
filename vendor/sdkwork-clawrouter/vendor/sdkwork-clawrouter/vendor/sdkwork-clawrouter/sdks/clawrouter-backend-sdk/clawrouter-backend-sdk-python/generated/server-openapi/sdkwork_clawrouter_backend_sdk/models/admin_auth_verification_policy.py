from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAuthVerificationPolicy:
    """Admin auth verification policy schema exposed by Claw Router."""
    email_code_login_enabled: bool
    email_registration_verification_required: bool
    phone_code_login_enabled: bool
    phone_registration_verification_required: bool
