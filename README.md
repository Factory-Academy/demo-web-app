# Cohesity Data Protection Platform

A Next.js/React/TypeScript application for managing enterprise data protection and security across hybrid cloud environments.

## Architecture

| Path | Purpose |
|---|---|
| `src/app/page.tsx` | Main dashboard — data source and backup job overview |
| `src/app/api/data-sources/route.ts` | API route handler for data sources |
| `src/models/data-source.ts` | DataSource model interface |
| `src/models/backup-job.ts` | BackupJob model interface |
| `src/components/data-source-list.tsx` | List component for data sources |
| `src/services/data-source-service.ts` | Business logic — priority calculation, validation |
| `tests/data-sources.test.ts` | Test coverage for data source service |

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Tests: `npm test`.

## API Endpoints

- `GET /api/data-sources` — List all data sources
- `POST /api/data-sources` — Create a new data source
