# Agent guide

This repository is a minimal Next.js 14 template for Factory sales demos. It is
not a production application. Agents usually either maintain the reusable
template or customize it on an ephemeral `demo/<company>-<date>` branch.

## Prerequisites and setup

- Use Node.js 18.17 or newer, which is required by Next.js 14.
- Use npm. The repository does not currently commit a lockfile, so use
  `npm install`, not `npm ci`.
- Install dependencies from the repository root:

  ```bash
  npm install
  ```

An install may create `package-lock.json` locally. Include it in a change only
when the task intentionally establishes or updates the dependency lockfile.

- Start the development server and open <http://localhost:3000>:

  ```bash
  npm run dev
  ```

Do not commit `node_modules`, `.next`, local environment files, or credentials.
If a task introduces environment variables, document their names and provide
safe example values rather than committing secrets.

### Environment contract

The base template has no required or optional application environment
variables. It must start locally without an `.env` file.

If a demo customization introduces environment variables:

- Add a `.env.example` containing safe placeholders for every variable.
- Document whether each variable is required, its default behavior, and where
  to obtain its value.
- Keep real values in `.env.local` or the platform secret store. Never commit
  credentials.
- Use `NEXT_PUBLIC_` only for values that are safe to expose to browser code.
- Update the environment section in `README.md` in the same change.

## Commands

Run these commands from the repository root.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build and run Next.js compile checks |
| `npm run start` | Serve an existing production build |
| `npm test` | Run the Jest test suite |
| `npm test -- --runInBand` | Run Jest once in a single process, useful in constrained agent environments |
| `npm run lint` | Run the Next.js lint command |
| `npx tsc --noEmit` | Run the strict TypeScript check directly |

There is no separate formatter script. Match the style of the surrounding
file, and do not add a formatter or change project-wide formatting unless the
task calls for it.

## Repository map

- `src/app/page.tsx`: App Router dashboard page.
- `src/app/api/items/route.ts`: In-memory example API route.
- `src/components/`: Reusable React components.
- `src/models/`: TypeScript domain interfaces.
- `src/services/`: Domain logic that can be tested without rendering React.
- `tests/`: Jest tests.
- `docs/`: Static documentation site.
- `.factory/AGENTS.md`: Short Factory-specific guidance. This root file is the
  primary repository-wide guide.

The `@/*` alias maps to `src/*`, as configured in `tsconfig.json`.

## Project conventions

- Keep TypeScript strict. Add explicit domain types instead of using `any` or
  disabling checks.
- Follow the App Router conventions used under `src/app`. Components are
  server components unless browser APIs, state, or event handlers require a
  `"use client"` boundary.
- Keep API route handlers small. Put reusable validation and business rules in
  `src/services` so they can be unit tested.
- Prefer focused function components with typed props. Preserve semantic HTML
  and accessible names when changing the UI.
- Use Jest for tests. Name test files `*.test.ts` or `*.test.tsx`, and add
  meaningful assertions for changed behavior, edge cases, and validation
  failures.
- Match the existing code style: single quotes, two-space indentation, and no
  semicolons.
- Avoid unrelated dependency, configuration, or generated-file changes.

## Template-specific rules

Tokens such as `{{COMPANY_NAME}}` and `{{PROJECT_DESCRIPTION}}` are deliberate
customization markers. On template-maintenance work, preserve them unless the
task explicitly changes the template contract. On a demo customization
branch, replace the markers consistently and rename generic `Item` and
`Widget` symbols, files, imports, API paths, and tests together.

This template intentionally uses a small in-memory data model. Do not add a
database, authentication system, state library, or deployment service unless
the requested demo needs it. Keep demo changes easy to explain in a short live
session.

Some demo branches may intentionally contain review findings, such as unsafe
rendering or missing tests. Do not copy those findings onto the reusable
template branch, and do not silently remove an intentional demo finding
without checking the task description.

## Development workflow

1. Read the issue and inspect the affected source, tests, and configuration
   before editing.
2. Check `git status` and treat existing changes as user work. Do not discard,
   overwrite, or reformat them.
3. Make the smallest complete change. Keep template markers and generic naming
   in sync across the repository.
4. Add or update Jest tests for behavior changes.
5. Run the narrowest relevant test first, then the applicable repository
   checks below.
6. Review `git diff` for accidental edits, generated artifacts, secrets, and
   unresolved markers that were supposed to be replaced.
7. In the handoff, summarize the change and report every command run, including
   failures or checks that could not run.

## Validation before handoff

For source changes, run:

```bash
npx tsc --noEmit
npm test -- --runInBand
npm run lint
npm run build
```

For a test-only change, the targeted Jest file plus the full test suite is
usually sufficient. For documentation-only changes, review rendered Markdown,
verify commands and paths against `package.json` and the repository, and check
links that were added or changed.

If a baseline command fails because this intentionally minimal template lacks
supporting configuration, report the exact failure. Do not bypass the check,
weaken TypeScript, disable lint rules, or add skip markers just to produce a
passing result.
