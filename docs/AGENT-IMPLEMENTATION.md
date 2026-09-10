# Bastion agent implementation

The app uses the existing Sites D1 binding rather than introducing a separate PostgreSQL service. This keeps its authoritative state in the supported hosting runtime. Journal entries remain in their original table. New tables are added through `drizzle/0001_mature_lake.sql`; do not edit the earlier deployed migration.

## Delivered workflows

- Ask Bastion drawer available throughout the site, with authenticated server-side Responses API calls.
- Tool-driven view/range/security/benchmark changes, exploratory scenarios, journal notes, monitoring rules, memory search, and provider company news.
- Versioned intent, evidence, scenarios, checkpoints, and rule records. Composite user/record/version keys reject conflicting edits. No model tool can silently accept an intent or scenario.
- Scenario values are recalculated by server code. Original journal rows are preserved and included in context.
- Agent Desk: investigations, context manifests, editable memory, version history, review queue, connection state, and token accounting.
- Cold-start context reconstruction, recent thread continuity, original conversation search, baseline plus changed versions, required-intent checks, and explicit omitted-context records.
- Up to three tool calls and four model responses per request. Byte-based context packing bounds are conservative estimates; actual provider token usage is recorded separately. No automatic model retries.
- Atomic daily allowance reservation. Unknown provider outcomes retain their reserved allowance until the UTC day changes. This is a token allowance, not a dollar or energy cap.
- Deterministic on-demand monitoring of dated reviews and quote thresholds. One-minute lease and per-rule/version/day alert deduplication. Price observations older than 20 minutes are not treated as current. Overnight/closed-market checks can therefore report partial coverage.
- Near-black graphite/cyan theme, independent gain/loss colors, larger secondary text, integrated surfaces, reduced-motion handling, and tabular numeric values.

## Connections required

Use Sites server runtime settings, never browser localStorage or a chat message, for secrets:

- `OPENAI_API_KEY`: enables model calls.
- `OPENAI_MODEL`: default `gpt-4.1-mini`; select an accessible compatible Responses/tool-calling model and evaluate before relying on it for difficult research. The default is a functional baseline, not a claim of best financial reasoning performance.
- `AI_DAILY_TOKEN_LIMIT`: defaults to 360000 per user, including reservations. One request reserves 120000 and settles against returned input/output usage. Model changes require retesting byte bounds and tool support.
- `FINNHUB_API_KEY`: existing quotes and assistant company-news access; verify provider entitlements.
- `MONITOR_JOB_TOKEN`: optional additional secret for `/api/monitor/scheduled`. A scheduler must ALSO authenticate through the private Sites dispatcher as the correct user. Setting this token does not create a schedule or bypass access controls.

The shipped application has no unattended scheduler registered. Manual checks and dated rules work after the migration; price checks need a feed. No fake “always monitoring” indicator is shown. No broker credentials or actual brokerage holdings are present. The existing demo portfolio is clearly labeled.

## Persistence and failure semantics

An authenticated user owns every query and write. UI writes enforce same-origin requests. Historical records are append-only and queryable. New versions are compare-and-swap updates by unique key; they are never a mutable overwrite of original text. Derived result records and tool outcomes are stored separately from accepted intent.

Each model request uses a client-generated UUID. Repeating that request returns its saved status instead of spending again. A request interrupted between a tool operation and result logging can have a durable action with incomplete logging; it is never blindly retried. Requests still running after five minutes are marked interrupted on history refresh. Unknown spending reservations are retained. This does not claim exactly-once execution across external systems.

The compiler records versions it supplied, applicable accepted-intent IDs, journal IDs, previous run, recent run IDs, changes, omissions, and limitations. Required accepted intent is never silently truncated. Optional records are bounded and can be fetched using memory search. Current retrieval is bounded SQL filtering/literal search, not a deployed embedding index. Model checkpoints are fallible, bounded excerpts of answers, with full original turns preserved. This does not guarantee perfect memory or interpretation.

Mutating tools check input versions and newly accepted intent before acting. Independent new scenario/note records do not overwrite concurrent user edits. A report becomes stale if its read dependencies or applicable accepted intent changed. UI actions are held for explicit application if the user's view changed during the request.

Saved evidence supports manually supplied HTTPS links and notes. Provider news excerpts and URLs are stored in tool outcomes. Full-document SEC ingestion, cross-source automated fact verification, statistical anomaly models, and calibrated model routing are future integrations. Do not label excerpts as verified full-document evidence.

## Verification

Run `node --experimental-strip-types --test tests/*.test.ts`, `python3 tests/memory-sql.test.py`, and `npx tsc --noEmit`, then the Sites build helper. Tests cover numerical reconciliation, symbol handling, context scope/budget, hypothetical status, temporal rules, server scenario recalculation, tenant isolation, optimistic conflicts, event dedupe, and allowance reservations.

Production model/network calls cannot be tested until credentials are configured. Browser visual QA was not requested in this implementation turn and is not claimed. The proposed 100-case research benchmark and quality/cost improvements have not been measured.
