# Issue label taxonomy

Every actionable issue should have:

- exactly one `priority:` label
- exactly one `type:` label
- one or more `area:` labels

The machine-readable source of truth is
[`labels.json`](labels.json). The **Sync issue labels** workflow creates missing
labels and updates their colors and descriptions after changes reach `main`.

## Priority

| Label | Use when |
| --- | --- |
| `priority: p0` | An active security issue, data loss, or a completely unusable demo requires immediate attention. |
| `priority: p1` | Major behavior is broken and should be handled promptly. |
| `priority: p2` | Normal planned work has meaningful impact but no urgent failure. |
| `priority: p3` | A minor improvement has no immediate impact. |

Use `priority: p2` when an issue has been triaged but no stronger priority
applies.

## Type

Choose the label that describes the work's primary outcome:

- `type: bug` fixes behavior that differs from the intended result.
- `type: feature` adds behavior or capability.
- `type: chore` covers maintenance, dependencies, and repository housekeeping.
- `type: documentation` changes only documentation or guidance.

## Area

Apply every area needed to route the work:

- `area: frontend` for pages, components, styling, and accessibility
- `area: api` for Next.js API routes and HTTP behavior
- `area: domain` for models, validation, and service-layer logic
- `area: testing` for automated or interactive QA
- `area: documentation` for README, agent guidance, and demo documentation
- `area: tooling` for build, lint, CI, and development tooling
- `area: demo` for customization markers and the live demo workflow

Agents should use these exact names when filtering or creating issues. Do not
create a synonym when an existing label applies.
