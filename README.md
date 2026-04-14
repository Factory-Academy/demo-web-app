# demo-web-app

A Next.js/React/TypeScript template repo used by the [demo-prep](https://github.com/Factory-Academy/demo-creation-skill) skill to generate personalized Factory AI sales demos.

**This is not a real application.** It's a minimal skeleton designed to be cloned, customized with prospect-specific domain models, and used as the backdrop for a 10-15 minute live demo of Factory's Droid. Best suited for prospects with frontend-heavy or fullstack teams (React, Vue, Angular, Next.js).

## How this repo gets used

1. An SE runs `/demo-prep` in Droid and provides a prospect company name
2. The skill researches the prospect's industry and tech stack
3. It creates a branch (`demo/{company}-{date}`) off this repo
4. Generic code (`Item`, `Widget`) is replaced with domain-specific models
5. Demo moments are planted — XSS vulnerabilities for code review, vague Linear tickets for spec mode, components with no tests
6. A draft PR is opened so Droid can review it live during the demo

The main branch stays untouched. All customization happens on ephemeral demo branches.

## What's in here

| Path | Purpose |
|---|---|
| `src/app/page.tsx` | Main page — dashboard with model cards |
| `src/app/api/items/route.ts` | API route handler for the primary model |
| `src/models/item.ts` | Primary model interface (gets renamed) |
| `src/models/widget.ts` | Secondary model interface (gets renamed) |
| `src/components/item-list.tsx` | List component for the primary model |
| `src/services/item-service.ts` | Business logic — priority calculation, validation |
| `tests/items.test.ts` | Basic test coverage |
| `.factory/AGENTS.md` | Droid coding instructions |

## Customization markers

Files contain `{{MARKER}}` placeholders that the demo-prep skill replaces at branch creation time. See the [demo-api README](https://github.com/Factory-Academy/demo-api#customization-markers) for the full marker table — the same markers are used across all three templates.

Files and classes are also renamed: `item.ts` becomes `patient.ts`, `Item` interface becomes `Patient`, and all imports are updated.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Tests: `npm test`.

## Persistent reviewed branch

The `demo/reviewed-example` branch has a draft PR ([#1](../../pull/1)) with pre-written review comments (XSS via `dangerouslySetInnerHTML`, accessibility issues, performance concerns). SEs use this as a fallback if the live PR hasn't been reviewed yet.

## Related repos

- [demo-api](https://github.com/Factory-Academy/demo-api) — Python FastAPI template
- [demo-cli](https://github.com/Factory-Academy/demo-cli) — TypeScript CLI template
