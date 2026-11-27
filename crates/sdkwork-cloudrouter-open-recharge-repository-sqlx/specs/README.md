# sdkwork-cloudrouter-open-recharge-repository-sqlx

PostgreSQL/SQLx implementation of the relay recharge store port
(`sdkwork_cloudrouter_router_service::api::OpenRechargeStore`).

It reads the commerce recharge catalog (`commerce_recharge_package`) and creates
points recharge orders through the order domain's recharge store, mapping the
result onto the API-key recharge contract (major-unit amounts, four-state order
status, public order number as the lookup key).

The crate exists separately so the router service depends on the port only and
the composition root (the edge runtime) injects the SQLx repository.

Verification:

```powershell
cargo test -p sdkwork-cloudrouter-open-recharge-repository-sqlx
```
