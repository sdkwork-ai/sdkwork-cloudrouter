> Migrated from `docs/verification-code-delivery.md` on 2026-06-24.
> Owner: SDKWork maintainers

## Runtime Behavior

Development and local environments must use the fixed verification code `666666`.
No real email or SMS provider may be called in this mode. The code still has to be
persisted in the normal verification-code store so login, registration, password
reset, email binding, and phone binding flows exercise the same verification path
as production.

Production environments must generate a non-fixed six-digit code, persist only its
hash where the auth store supports hashing, and dispatch the code through a
configured provider. Production responses must not expose `debugCode`. If no
active delivery provider is configured, production must fail closed instead of
silently returning a code or pretending delivery succeeded.

## Java SaaS

Java verification delivery uses the existing channel account standard:

- Email accounts are first-class `ChannelResourceType.EMAIL` resources.
- SMS accounts are first-class `ChannelResourceType.SMS` resources.
- Admin configures multiple accounts through `PlusChannelAccount`.
- Provider secrets must stay behind account configuration or secret references;
  raw secrets must not be returned from admin list APIs.
- `EmailSendServiceImpl` and `SmsSendServiceImpl` own provider dispatch and code
  persistence for their channel.

The Java development shortcut is intentionally located inside the email and SMS
send services. This keeps storage ownership in one place: auth services still call
the delivery service, and the delivery service decides whether the runtime is a
development runtime or a real provider runtime.

## Rust SaaS

Rust auth routes use the `VerificationCodeSender` port:

- Local/dev routers inject `DebugVerificationCodeSender` and expose `debugCode`.
- Production routers inject a real sender and hide `debugCode`.
- `RequiredConfiguredVerificationCodeSender` is the fail-closed production
  sentinel when provider wiring is absent.

Provider selection uses `VerificationDeliveryConfigStore`. The store selects an
active delivery config by tenant, organization, channel, scene, priority, and
weight from the standard integration tables:

- `ai_channel`
- `integration_provider_account`

The selected config includes provider code, channel id, account id, account code,
secret reference, optional base URL, optional sender/sign name, and optional
template code. It never returns a raw provider secret.

## Capability Tags

Verification delivery channels must declare the concrete channel capability:

- `email` or `verification:email`
- `sms` or `verification:sms`

Scene-specific routing is optional. When needed, add:

- `verification:scene:login`
- `verification:scene:register`
- `verification:scene:reset_password`
- `verification:scene:bind_email`
- `verification:scene:bind_phone`

The generic `verification` capability may be used as a descriptive tag, but it is
not sufficient by itself for channel matching. This prevents an unrelated channel,
for example push notification, from being selected for email or SMS delivery.

## Admin Configuration

Admin must support multiple email and SMS accounts. Recommended account examples:

- Amazon SES, SendGrid, SMTP, and other email providers as email delivery
  accounts.
- Alibaba Cloud SMS, Tencent Cloud SMS, Twilio, and other SMS providers as SMS
  delivery accounts.

Each account must carry:

- Provider code and channel/account identity.
- `secretRef` pointing to Vault, KMS, keychain, or another approved secret backend.
- Template code and sender/sign metadata in structured auth/config metadata.
- Status, priority, and weight for active routing.

The list endpoints for Java admin are:

- `/backend/v3/api/channel/account/list_email`
- `/backend/v3/api/channel/account/list_email/page`
- `/backend/v3/api/channel/account/list_sms`
- `/backend/v3/api/channel/account/list_sms/page`

Production systems should monitor provider selection failures as configuration
errors. A missing active provider is not a soft warning; it blocks verification
code issuance because the user cannot complete the flow without delivery.

