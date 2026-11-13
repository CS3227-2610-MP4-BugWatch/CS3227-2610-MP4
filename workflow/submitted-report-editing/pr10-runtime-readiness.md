# PR10 disposable local runtime readiness

The dedicated local runtime is ready for feature-plan revision 8, after PR10 introduced migration `013_developer_question_quota.sql` and editing moved to `014_report_editing_mailbox.sql`. On 2026-11-13, a clean no-seed reset successfully loaded repository migrations 001–014 in order. The CLI migration table records all fourteen versions, including 012 resolutions, 013 developer question quota and 014 editing. See [migration history](pr10-migration-history.txt).

Before reset, Docker inspection confirmed database container `supabase_db_bugwatch-report-editing`, project label `bugwatch-report-editing` and database host port `55422`. Gateway inspection confirmed the same project and HTTPS host port `55421`; the ignored work directory configuration matched these values. A distinct custom-format backup was preserved privately at `C:/Users/jonat/AppData/Local/Temp/bugwatch-report-editing-private/pre-pr10-20261113.dump` (585,225 bytes). `pg_restore --list` successfully validated its archive contents. No restore rehearsal was performed; the earlier pre-reconciliation backup was preserved.

The obsolete ignored `013_report_editing_mailbox.sql` copy was removed with a nonrecursive operation after checking that its resolved absolute path was inside `runtime.local`. The ignored migration directory now contains fresh repository copies 001–014. Git confirmed that the runtime migration copy remains ignored. The applied 014 source SHA-256 was `1ECB303604F38431362CE8FB231E435B14430812C0D4292DE0253622D4EB50FE`.

The public local certificate and private stack status were refreshed. Four disposable identities and profiles were recreated: Tester, Developer, second Developer and other Tester. All four password sign-ins succeeded through verified HTTPS. Fresh credentials and tokens remain outside the workspace in the existing private temporary directory; no secrets were added to the outputs. Tokens expire and need renewal for later sessions.

Actual verification:

- Local CLI `db reset --no-seed --yes` against the dedicated work directory: Passed; private reset output retained outside the workspace.
- Migration history query through the pinned local container: Passed; [fourteen ordered migrations](pr10-migration-history.txt).
- `verify_report_editing_mailbox.sql`, after its prerequisite comment was corrected to 001–014: Passed; [output](pr10-sqlverification-editing_mailbox.txt). Rollback, replay, no-op, ABA and legacy guard checks completed; fixtures rolled back.
- `verify_report_resolutions.sql`: Passed; [output](pr10-sqlverification-resolutions.txt). Fixtures rolled back.
- Database, metadata, storage, realtime, mail, auth and gateway containers: healthy at readiness inspection; REST running.
- Six database suites, fourteen concurrency cases, browser checks and coverage: Not run by this runtime agent; the coordinator owns the fresh integration evidence.

The API remains `https://127.0.0.1:55421`, PostgreSQL `127.0.0.1:55422`, and mail viewer `http://127.0.0.1:55424`. The existing ignored launcher loads the refreshed private environment and enforces the dedicated HTTPS origin. No application server was started by this agent. Studio, imgproxy, edge runtime, analytics, vector and the pooler remain excluded.

Only this disposable local stack was changed. No hosted database, other local project, production environment file, application source or test file was changed by this runtime assignment. These local results do not establish hosted deployment or browser correctness.
