# Repository Guidelines

## Project Structure & Module Organization
The root package is a Next.js 14 App Router app. Put pages in `app/`, shared UI in `components/`, and reusable logic in `lib/` such as `lib/auth`, `lib/errors`, and `lib/supabase`. API endpoints live under `app/api/**/route.ts`. Tests live in `tests/e2e/` and `tests/api/`. Static assets belong in `public/`; schema and migrations belong in `supabase/`. `cli/` contains the standalone TypeScript CLI, and `server/` contains the live-chat relay. Do not edit `cli/dist/` by hand; rebuild from `cli/src/`.

## Build, Test, and Development Commands
- `npm install` installs the Next.js app dependencies.
- `npm run dev` starts the app on `http://localhost:3000`.
- `npm run build` builds the production app.
- `npm run lint` runs Next.js ESLint checks.
- `npm test` runs the full Playwright suite.
- `npm run test:e2e` runs browser flows in `tests/e2e/`.
- `npm run test:api` runs API coverage in `tests/api/`.
- `npm run test:report` opens the Playwright HTML report.

- `cd cli && npm install && npm run build` compiles the CLI.
- `cd server && npm install && npm run dev` starts the realtime relay with file watching.

## Coding Style & Naming Conventions
Use TypeScript with 2-space indentation, semicolons, and ES module imports. Follow the existing App Router patterns: page files are `page.tsx`, API handlers are `route.ts`, hooks use `useX.ts`, and tests end in `.spec.ts`. Prefer PascalCase for React components, camelCase for functions and utilities, and descriptive folder names like `app/dashboard/avatar/create`.

## Testing Guidelines
Playwright is configured in `playwright.config.ts` and starts `npm run dev` automatically for root tests. Keep UI flows in `tests/e2e/*.spec.ts` and endpoint coverage in `tests/api/*.spec.ts`. Add or update tests with behavior changes. API tests depend on local env configuration and Supabase policies, so note required seed data, RLS changes, or new environment variables in the PR.

## Commit & Pull Request Guidelines
There is no committed history on `main` yet, so use an imperative convention: `feat: add avatar marketplace filter`, `fix: handle missing Supabase session`. Keep commits scoped to one change. PRs should include a short summary, affected paths, setup or migration notes, and verification commands. Include screenshots for UI changes and call out `.env.local`, Stripe, Supabase, or Sentry impacts.

## Security & Configuration Tips
Keep secrets in `.env.local` and update `.env.example` when adding new non-secret keys. Never commit generated artifacts such as `playwright-report/`, `test-results/`, or local credentials. Review `supabase/migrations/` and auth-related code carefully for schema or RLS changes.
