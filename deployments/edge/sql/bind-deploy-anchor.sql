-- Bind the production Cloud Router installation to its deploy application.
--
-- Why
--   IAM resolves an installation by `iam_application_installation.deploy_application_id`
--   and signs that value into the access token's `app_id`/`aud` (migration 0040/0043;
--   sdkwork-iam cda02b6a, 8eedabec, b918c3ce). The production installation was created
--   on 2026-11-01 by the retired "IAM runtime app id" flow, so its anchor is NULL and
--   the portal's credential could never name the application it is deployed as.
--
--   A duplicate registration created on 2026-11-19 (`tapp_100001_0_381764684287578112`,
--   app_id app_01a1f385-c952-7b30-b745-047d589448f8) holds the canonical anchor with
--   zero sessions, so the unique index `uk_iam_application_installation_deploy` blocks
--   the production row from claiming it.
--
-- Anchor
--   381764684287578112 is the value this repository declares for every profile
--   (`etc/topology/*.env` and `etc/topology/overrides/*.env`: SDKWORK_DEPLOY_APPLICATION_ID),
--   and it is the decimal `deploy_app.id` of the `sdkwork-cloudrouter` application.
--
-- Prerequisites
--   * Dump the affected rows first (see ../README.md "Anchor migration").
--   * The gateway audience allow-list must already contain 381764684287578112,
--     otherwise the freshly issued token is rejected (audit fails closed).
--
-- Rollback
--   Run the same file with COMMIT replaced by ROLLBACK for a dry run. To undo after
--   a real run, restore the dumped rows (the duplicate row and its two environment
--   rows) and set deploy_application_id back to NULL.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  canonical text := '381764684287578112';
  production_id text := 'tapp_100001_0_sdkwork_cloudrouter';
  duplicate_id text := 'tapp_100001_0_381764684287578112';
  duplicate_app text := 'app_01a1f385-c952-7b30-b745-047d589448f8';
  holder text;
BEGIN
  SELECT id INTO holder
    FROM iam_application_installation
   WHERE deploy_application_id = canonical;
  IF holder IS DISTINCT FROM duplicate_id THEN
    RAISE EXCEPTION
      'canonical anchor % is held by % instead of the known duplicate %; refusing to continue',
      canonical, coalesce(holder, '(none)'), duplicate_id;
  END IF;

  IF (SELECT count(*) FROM iam_session WHERE app_id = duplicate_app) > 0 THEN
    RAISE EXCEPTION 'duplicate installation % still owns sessions; refusing to delete it', duplicate_app;
  END IF;

  IF (SELECT deploy_application_id FROM iam_application_installation WHERE id = production_id) IS NOT NULL THEN
    RAISE EXCEPTION 'production installation % already has a deploy anchor; refusing to overwrite', production_id;
  END IF;
END $$;

DELETE FROM iam_application_installation_environment
 WHERE installation_id = 'tapp_100001_0_381764684287578112';

DELETE FROM iam_application_installation
 WHERE id = 'tapp_100001_0_381764684287578112'
   AND app_id = 'app_01a1f385-c952-7b30-b745-047d589448f8';

UPDATE iam_application_installation
   SET deploy_application_id = '381764684287578112',
       updated_at = now()
 WHERE id = 'tapp_100001_0_sdkwork_cloudrouter'
   AND deploy_application_id IS NULL;

DO $$
DECLARE
  anchor text;
  leftovers integer;
BEGIN
  SELECT deploy_application_id INTO anchor
    FROM iam_application_installation
   WHERE id = 'tapp_100001_0_sdkwork_cloudrouter';
  IF anchor IS DISTINCT FROM '381764684287578112' THEN
    RAISE EXCEPTION 'production installation anchor is % after update', coalesce(anchor, '(null)');
  END IF;

  SELECT count(*) INTO leftovers
    FROM iam_application_installation
   WHERE id = 'tapp_100001_0_381764684287578112';
  IF leftovers <> 0 THEN
    RAISE EXCEPTION 'duplicate installation is still present';
  END IF;
END $$;

SELECT id, app_id, deploy_application_id, status, environment
  FROM iam_application_installation
 WHERE id = 'tapp_100001_0_sdkwork_cloudrouter';

COMMIT;
