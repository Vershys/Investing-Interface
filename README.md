# Bastion — Investing Interface

A private investment workspace with a near-black and cool-blue visual system, responsive interactive charts, company research, explicit valuation scenarios, and a persistent decision journal.

## Current release

The market sidebar and Markets tab now use supported TradingView delayed stock-data embeds. A Finnhub quote adapter is ready but needs an appropriately entitled server-side API key. See [market-data implementation and research](docs/MARKET-DATA.md). Broker buttons beneath quotes open the selected Robinhood stock page without submitting orders.


- Portfolio and per-stock graphs with seven ranges, normalized comparisons, accessible data tables, and CSV export.
- Position search and sorting, capital allocation, and reconciled daily contribution calculations.
- Company research questions, source links, and thesis-review drafts.
- LUMN illustrative enterprise-value / EBITDA model with debt and dilution sensitivities.
- Authenticated, user-isolated decision journal stored in Cloudflare D1.
- Responsive layout, keyboard controls, reduced-motion support, and optional light theme.

**All portfolio values, price paths, reference prices, and investment theses are synthetic examples.** They are not live quotes, actual holdings, verified research, or investment advice. The source links are starting points, not evidence that the sample thesis is true.

Robinhood is **not connected**. No passwords, brokerage tokens, or personal financial data are included in the repository. The connection dialog explains the pending provider setup and never pretends to connect.

## Development

Requires Node 22.13 or later. The project uses the Sites Vinext starter (React/Next-compatible routing on Cloudflare Workers), TypeScript, Recharts, and existing Radix/Shadcn primitives.

```sh
npm ci
npm run dev
npm run build
npm run db:generate
node --experimental-strip-types --test tests/finance.test.ts
npx tsc --noEmit
```

The deployed journal uses platform-forwarded identity on private Sites. Direct local requests without that identity are rejected. Do not expose an alternative origin that accepts client-forged authentication headers. Database migrations are generated from `db/schema.ts` and applied during Sites deployment. Never commit `.env` files or real account exports.

## Persistence and hosting

The first release uses D1 for the journal, replacing the earlier provisional PostgreSQL proposal to match the deployed runtime. Provider and calculation boundaries remain separate. A later PostgreSQL migration is possible if analytics needs justify it. Private hosting requires ChatGPT authentication; server handlers enforce per-user ownership on journal reads and writes.

`app/workspace.tsx` owns the four working views; `lib/finance.ts` contains deterministic calculations and explicitly synthetic data. `app/api/journal/route.ts` validates and saves records; `app/api/connection/route.ts` reports the disconnected state. `.openai/hosting.json` identifies the deployment and logical database binding. There are no provider secrets to configure for demo mode.

See [implementation roadmap](docs/ROADMAP.md) and [design rationale](docs/DESIGN.md).

## Local company research

The Research Desk now includes a separate local service and ChatGPT account connection. See [Local research setup](docs/LOCAL-RESEARCH.md) for startup instructions, data storage, supported workflows and the remaining live-account verification gate. Start both processes with `npm run local`.
