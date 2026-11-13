# BugWatch

BugWatch is a bug tracker for administrator-provisioned Tester and Developer accounts. Users work with projects and bug reports, including drafts, report discussions and updates in a private mailbox. See the [User Guide](docs/UserGuide.md) for workflows.

### Accounts for MP4 Testing

| Role | Email | Password |
| --- | --- | --- |
| Developer | developerdavid@mail.com | d3vDavid |
| Developer | developerdanielle@mail.com | d3vDanielle |
| Tester | testerterence@mail.com | t3stTerence |
| Tester | testertrisha@mail.com | t3stTrisha |

Access the site [here](https://cs-3227-2610-mp-4-ruby.vercel.app)

## Local setup

Use Node.js 24 and npm. From a fresh clone, run `npm ci`. Copy `.env.example` to `.env` only if `.env` does not already exist, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for your Supabase project. Never put secrets or service-role keys in `VITE_` variables or commit credentials.

Apply migrations `001` through `014` in numerical order and provision accounts and profiles as described in [authentication setup](docs/developerGuide/Authentication.md), [project development](docs/developerGuide/Projects.md), and [bug report development](docs/developerGuide/Reports.md). Use a separate isolated project for hosted tests; these instructions do not establish that a hosted environment has been migrated.

The optional assistant endpoints use server-only settings in `.env.example`, including `SUPABASE_SERVICE_ROLE_KEY`, `SOCLAAS_API_KEY`, and `SOCLAAS_MODEL`. Both `TESTER_SUGGESTIONS_ENABLED` and `DEVELOPER_QUESTIONS_ENABLED` default to `false`; enable them only when intentionally configured for use.

Run `npm run dev` and open the URL printed by Vite. The local Vite server wires the assistant API routes; the Vercel CLI is not needed for local development.

## Verification

```sh
npm run test -- --run
npm run lint
npm run build
npm run docs:build
```

The ordinary unit suite does not require Supabase credentials. See the developer guides for isolated database tests and their credentials. The project branch policy is to open a pull request to `development`, verify the Vercel preview deployment, and then open a pull request from `development` to `master`.

## Structure

- `src/features/`: authentication, projects, reports, and mailbox features.
- `src/shared/`: shared components, services, and types.
- `src/test/`: automated tests.
- `api/`: server endpoints and their dependencies.
- `docs/`: user and developer guides and reflections.
- `workflow/`: feature records, instructions, and templates.
- `public/`: static assets.
