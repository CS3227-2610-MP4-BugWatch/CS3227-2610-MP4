# Isolated local database readiness

The disposable `bugwatch-report-editing` Supabase project is running for this feature. It is separate from the stopped `bugwatch-presentation` project. No hosted database was contacted or changed during setup. Docker Desktop was started hidden.

- API: `https://127.0.0.1:55421`.
- PostgreSQL: `127.0.0.1:55422`; container `supabase_db_bugwatch-report-editing`.
- Local mail viewer: `http://127.0.0.1:55424`.
- Migrations001–011 applied successfully on initial startup. Migration012 awaits the backend owner's readiness confirmation.
- Auth, gateway, database, storage, realtime and metadata containers reported healthy. REST was running. Studio, imgproxy, edge runtime, analytics, vector and the connection pooler were excluded to reduce memory use.
- Four synthetic users have profiles: Tester, Developer, second Developer and other Tester. All four password sign-ins succeeded through verified HTTPS.

Private runtime files are outside the repository in `C:/Users/jonat/AppData/Local/Temp/bugwatch-report-editing-private/`: `runtime.env`, `identities.local.json`, `stack.local.json`, `stack-start.local.log` and the public `local-api-ca.pem`. Do not copy these files into documentation or logs. The environment contains the local service key and access tokens. Tokens expire; recreate or refresh them before a later session.

The ignored work directory is `E:/CS3227-2610-MP4/workflow/submitted-report-editing/runtime.local/`. `git check-ignore` confirmed that its launcher and bootstrap files are ignored. The launcher imports the private environment into a child process and checks the dedicated local HTTPS origin before starting it. Node trusts only the exported local certificate in addition to its normal trust store. The database suites retain their existing distinct HTTPS origin and isolated-project guards. The production origin used for comparison came from the existing `.env.local`; there is no root `.env`.

From the repository root, run selected integration tests with:

```powershell
node workflow/submitted-report-editing/runtime.local/run-local.mjs test --run --maxWorkers=1 src/test/report-discussion-database.test.ts
```

The coordinator can start its single application server with:

```powershell
node workflow/submitted-report-editing/runtime.local/run-local.mjs server --host 127.0.0.1 --port 5186
```

The launcher disables live report suggestions. No development server or live model request was started during setup. No integration suite has yet been run by this runtime setup agent. Browser checks must accept the dedicated local HTTPS certificate, for example through a browser context limited to this local test session.

For SQL sessions, use the installed Docker executable. This environment required an elevated tool call to access its Docker pipe:

```powershell
& 'C:/Users/jonat/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe' exec -i supabase_db_bugwatch-report-editing psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

Only stop this feature project with the following command; do not stop other Docker projects. Supabase retains this project's local data by default:

```powershell
& 'C:/Users/jonat/AppData/Local/npm-cache/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-windows-x64/bin/supabase.exe' stop --workdir workflow/submitted-report-editing/runtime.local
```

To restart it, use the same CLI and work directory with `start --exclude studio,imgproxy,edge-runtime,logflare,vector,supavisor`. Redirect all startup/status output to the private temporary directory because the CLI prints local credentials. Do not publish that output. No dependency or application configuration was changed.
