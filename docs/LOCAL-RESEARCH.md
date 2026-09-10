# Bastion local company research

This implementation adds a company Research Desk to the existing Bastion application and a separate Node.js research service. The hosted application is not automatically updated or connected to a computer's loopback service.

## Start on your computer

For automatic Windows updates, use [the update-and-launch setup](WINDOWS-UPDATES.md)
and download `Start-Bastion.bat` from the repository. The manual ZIP steps below
do not automatically update your code.

Prerequisites: Node.js 22.13+ (Node 24 recommended), this source checkout, and an installed Codex CLI with App Server support. Install Codex using the [official setup instructions](https://developers.openai.com/codex/quickstart). No API key is needed for this module's ChatGPT account route.

From the project directory:

```sh
npm ci
npm run local
```

Open `http://127.0.0.1:4317`, select **Research desk**, and choose **Connect ChatGPT**. If Codex already has a ChatGPT session, the connection is reused. Otherwise, follow **Continue sign-in with ChatGPT** and complete the official browser flow. Bastion never requests a password or copies the OAuth token into its database. Account credentials are managed by Codex. Then enter `NYSE:ORN` and choose **Research company**.

The launcher binds the frontend to port 4317 and the research service to port 4319, both on 127.0.0.1. Both must be available. Closing the launcher stops both. Do not expose either through a public tunnel. This is a single-user local development launcher, not a public production server.

On a clean clone, the existing portable framework profile is used. This preserves Bastion's existing local authentication simulation and local Cloudflare storage behavior; it does not import hosted journal records. Use the literal 127.0.0.1 address, not localhost, because the research service checks its expected origin. This managed build environment has no user-facing local preview.

## What is implemented

- Company research input with optional investigation focus.
- ChatGPT browser login through a separate Codex App Server process over stdio.
- Versioned structured report schema and a reusable company research prompt.
- Company portfolio/revenue, financials by annual/quarterly/TTM/snapshot basis, subsidiaries, contract awards, operating risks, competition, issuer-specific definitions, and source register.
- Value/source details, professional contact links, report import/export, research history, cancellation, interrupted-run recovery, saved-report follow-ups and journal drafting.
- Atomic file replacement for run persistence, request UUID deduplication, one active model run at a time, and no silent paid retries.
- Schema/type checks, safe source links, source ID integrity, subsidiary hierarchy checks, explicit missing values, and a narrowly scoped operating-income reconciliation warning.
- Loopback-only service, exact Host/Origin checks, a required custom request header, no CORS, bounded request bodies, and model requests restricted to research. Shell/unified execution and discovered app/MCP integrations are disabled for each research thread; approval requests are refused. Managed Codex policies are respected and incompatible settings fail the run.

The report is not arbitrary model-generated HTML. React components render a fixed schema; narratives are plain text. Imports pass the same validation as generated reports.

## Data and configuration

Reports and run states default to `~/.bastion/research/runs`. Each report run has its own ID. Refreshing creates another report; follow-up answers refer to a saved report ID. Back up this directory to preserve the research history. Model context is rebuilt from the selected report; this version does not assume unlimited thread memory or import ChatGPT memories.

Optional process environment settings:

| Variable | Purpose |
| --- | --- |
| `BASTION_RESEARCH_DATA` | Override the local research data directory. |
| `BASTION_CODEX_BIN` | Absolute path to an existing Codex executable if it is not on PATH. |

The launcher sets `BASTION_LOCAL_RESEARCH=1` internally to enable the development proxy. That setting is not a hosted secret. Existing `OPENAI_API_KEY` settings belong to Bastion's earlier assistant and are separate from this module.

Local storage does not imply local inference: prompts and selected report context are sent to the model provider. Account subscription limits, models and web-search availability depend on the installed Codex runtime and account. This is not an embedding of a specific custom GPT or automatic access to previous ChatGPT conversations.

## Implementation map

- `app/research-desk.tsx`: report views, connection UI, history and follow-ups.
- `lib/research/schema.mjs`: canonical model/persistence wire schema and validation.
- `lib/research/types.ts`: UI types.
- `services/research/server.mjs`: HTTP controller and run lifecycle.
- `services/research/codex.mjs`: replaceable App Server adapter.
- `services/research/prompt.mjs`: company and follow-up instructions.
- `services/research/store.mjs`: local atomic report storage.
- `scripts/start-local-research.mjs`: launches the two local processes.

## Verification and remaining gates

Run `npm run test:research` and `npx tsc --noEmit`. The existing Sites build is also required for changes to the module. The research suite covers HTTP origin/host restrictions, idempotent execution, persistence and restart recovery, schema/evidence rejection, App Server initialization, structured output and interruption using a simulated runtime.

**Live model authentication and research have not been verified in the implementation workspace: no Codex executable is installed there.** The protocol follows [official App Server documentation](https://learn.chatgpt.com/docs/app-server), but installed-version compatibility must be tested with the real account. Generate the protocol schema with the installed CLI when diagnosing version differences; do not relax permissions to make an incompatible runtime work. No browser visual QA was requested or performed.

Research quality is not yet benchmarked. The service currently delegates issuer resolution, web research and document interpretation to Codex. It does not independently retrieve/archive SEC documents, validate every quoted number against a filing, or prove comprehensive award coverage. Source URLs and locators are model-provided and require review. There is no automated financial data vendor feed or automatic sync with hosted Bastion memory. The first account-connected acceptance test is ORN, followed by a recurring-revenue company and a bank to check semantic differences.

Atomic JSON files are a simple first local persistence layer, not the proposed full analytical database. There is no cross-process transaction/locking guarantee beyond the single bound service; do not run multiple services against the same directory. Incremental document ingestion, normalized fact history and deterministic financial calculations are subsequent extensions.


## Research visibility

New runs save up to 150 recent activity records with the report. The Research Desk displays separate clocks for the last successful service response and the last Codex research event. A responsive service does not prove that cloud research is progressing. After 60 seconds without a research event, the UI explains the silence without automatically retrying or declaring failure.

Search actions, source links, agent commentary and supported readable summaries appear in the activity timeline. Summaries are not a complete account of internal reasoning. Raw reasoning and command output are not recorded. Older reports may have no timeline. The page polls every three seconds and retries service checks after connection loss. Closing the terminal still stops the research service. Let an existing run finish before restarting to install this update.

This release adds visibility only: it does not infer private thoughts or render unfinished financial data as validated findings.
