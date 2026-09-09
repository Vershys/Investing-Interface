# Implementation roadmap

## Delivered foundation

Interactive portfolio, stock exploration, contribution and allocation, research desk, illustrative scenario calculator, persistent private journal, light/dark preferences, authenticated journal API.

## Integration gate

1. Confirm SnapTrade Personal integration, Robinhood account types, read-only access, reconnect behavior, production requirements and cost.
2. Select licensed market data and verify quote delay, adjusted history, extended hours, attribution and display rights.
3. Configure hosted server-only credentials and the authorized connection flow. Do not ask the user to paste brokerage credentials into the app.
4. Implement normalized accounts, securities, positions, orders and transactions with provider IDs, source timestamps and idempotent synchronization.
5. Reconcile holdings and balances before replacing demo mode. Use separate quote, holdings, and transaction timestamps.

## Portfolio accounting

Use fixed-point/decimal financial storage for real data. Snapshot holdings and balances. Reconstruct history only where transactions, cash movements and corporate actions support it. Never back-project current holdings. Build time-weighted returns, money-weighted returns with explicit conventions, dividends, benchmark total-return comparison, and missing-history states. The current demo Return graph only normalizes its synthetic path and is not a production TWR/MWR implementation.

## Research and scenarios

Ingest SEC submissions and facts through a background worker. Preserve period, units, filing date, restatements and source provenance. Introduce reviewable factual claims and user-approved thesis changes. Add analyst financial charts and contract realization only when disclosed data support them. Add scenario versions, probability calibration and portfolio overlap after the basic records reconcile.

## Release validation

Finance unit checks and production compilation are included. Browser/visual QA and live-provider integration remain to be performed. Test real journal create/reload on the private deployed site. Review chart labeling, exact data access, mobile/tablet layouts, 200% zoom, theme contrast and keyboard use. Add provider retry/disconnect, history reconciliation, and security tests before enabling live brokerage data.

## Persistence workflow

Treat GitHub as the editable source of truth. Keep every update in the same repository with migrations and design decisions. Sites deployment also requires its own source remote; publish the matching source revision there. Source changes alone do not automatically deploy from GitHub.
