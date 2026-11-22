-- sdkwork:migration
-- id: 0018_user_settings_console
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Reverse 0018_user_settings_console — drop the console user settings
--   tables (iam_user_preference, integration_webhook_endpoint).
-- reversible: true
-- transactional: true

DROP TABLE IF EXISTS integration_webhook_endpoint;
DROP TABLE IF EXISTS iam_user_preference;
