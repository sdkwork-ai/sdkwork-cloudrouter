#!/usr/bin/env python3
from pathlib import Path
import re

path = Path(r"E:\sdkwork-space\sdkwork-order\crates\sdkwork-commerce-order-repository-sqlx\src\postgres_order.rs")
source = path.read_text(encoding="utf-8")
source = re.sub(
    r"        let _ = command\.cancel_reason;\n        sqlx::query\([\s\S]*?failed to close order payment attempts\", error\)\)\?;\n\n        Ok\(\(\)\)\n    \}\n\n    pub async fn pay_owner_order\([\s\S]*?^    \}\n\}",
    "        let _ = command.cancel_reason;\n\n        Ok(())\n    }\n}",
    source,
    count=1,
    flags=re.MULTILINE,
)
source = re.sub(
    r"\nstruct OwnerPaymentMethod[\s\S]*?async fn load_checkout_session_for_order",
    "\n\nasync fn load_checkout_session_for_order",
    source,
    count=1,
)
source = re.sub(
    r"\nfn order_status_is_payable[\s\S]*?async fn load_owner_payment_method[\s\S]*?\}\n",
    "\n",
    source,
    count=1,
)
source = source.replace(
    "use sdkwork_commerce_contract_service::{\n    CommerceMoney, CommercePaymentStatus, CommerceServiceError,\n};",
    "use sdkwork_commerce_contract_service::{CommerceMoney, CommerceServiceError};",
)
source = source.replace(
    "    OrderOwnerSummary, PayOwnerOrderCommand, PayOwnerOrderOutcome,\n};",
    "    OrderOwnerSummary,\n};",
)
source = source.replace("use std::collections::BTreeMap;\n", "")
path.write_text(source, encoding="utf-8")
print("stripped postgres_order.rs")
