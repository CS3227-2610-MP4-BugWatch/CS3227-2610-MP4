# Reconciled disposable local runtime

The dedicated `bugwatch-report-editing` database is ready for reconciliation integration tests. On 2026-11-12, the existing database was backed up before a clean local reset. The reset applied repository migrations 001–012, including `012_report_resolutions.sql`, without seed data. Migration `013_report_editing_mailbox.sql` then applied successfully after the backend owner and coordinator confirmed readiness. The old editing migration 012 was not applied to the rebuilt database.

Before reset, Docker inspection confirmed container `supabase_db_bugwatch-report-editing`, project label `bugwatch-report-editing`, and database port `55422`. The ignored work directory configuration confirmed the same project and API port `55421`. The custom-format backup is preserved outside the workspace at `C:/Users/jonat/AppData/Local/Temp/bugwatch-report-editing-private/pre-reconcile-20261112.dump` (570,524 bytes). `pg_restore --list` successfully validated its archive contents. This is an archive check; a restore rehearsal was not performed.

The local CLI reset exited successfully. A subsequent database query showed migration history 001–012 and absence of the old edit function. Migration 013 was applied directly through the pinned container with `psql -v ON_ERROR_STOP=1`; it is therefore not recorded in the CLI migration table by this run. The ignored migration directory now contains repository copies 001–013 for future clean local resets. The applied 013 source SHA-256 was `FC598C715E02BF7A2EC25B1E3A614059850F230AE2E17E58ABF5BB9EB3A74855`.

The public local certificate and private stack status were refreshed. Four disposable identities and profiles were created (Tester, Developer, second Developer, other Tester); all four password sign-ins succeeded through verified HTTPS. Private credentials and tokens remain in the unchanged external temporary directory. Tokens expire and must be refreshed for later sessions. No root environment file, hosted database, or other local project was changed.

Verification performed:

- Migration 013: Passed; [output](reconcile-migration-013.txt).
- Editing SQL verifier: Passed, including rollback, replay, no-op, ABA and legacy guard structure checks; [output](reconcile-sql-verification-editing_mailbox.txt). Its fixtures rolled back.
- Resolution SQL verifier: Passed; [output](reconcile-sql-verification-resolutions.txt). Its fixtures rolled back.
- Database/auth/gateway/storage/realtime/metadata containers: healthy at readiness inspection; REST running.
- Application integration suites, coverage and browser behavior: Not run by this runtime agent. The coordinator owns those checks and their interpretation.

The API remains `https://127.0.0.1:55421`, PostgreSQL `127.0.0.1:55422`, and mail viewer `http://127.0.0.1:55424`. Studio, imgproxy, edge runtime, analytics, vector and the pooler remain excluded. The existing ignored launcher loads the private environment and enforces the dedicated HTTPS origin. Example from the repository root:

```powershell
node workflow/submitted-report-editing/runtime.local/run-local.mjs test --run --maxWorkers=1 src/test/report-discussion-database.test.ts
```

This evidence applies to the disposable local runtime only. No hosted compatibility or deployment result is claimed.

