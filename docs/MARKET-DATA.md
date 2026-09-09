# Market browsing and efficient delivery

## Current implementation

Near-black (#0f0f0f), neutral charcoal surfaces, and a cool blue (#8ab4f8) accent replace the olive theme. The responsive sidebar searches a small local stock directory instantly and supports explicit US ticker lookup on submit. Symbol selection updates the quote and keeps the Robinhood destination synchronized. The broker link navigates only; it never transmits an order.

TradingView's supported Symbol Info and Advanced Chart embeds provide actual **delayed** market data without an API key. Provider attribution and data-status indications remain intact. Unsupported symbols and network failures are not filled with fabricated prices. The demo portfolio is deliberately separate from provider quotes.

A Finnhub server adapter is implemented at /api/market/quote. It requires FINNHUB_API_KEY in the private hosted runtime. No key is currently configured. Real-time access must be confirmed against the user's provider/exchange entitlement. API responses expose original quote time separately from retrieval time. A recent HTTP response does not mean a recent trade, especially outside market hours.

## Efficiency choices and limits

- Search/filter is O(n) over 12 labels; no network requests on each keystroke. Exact lookup requires submit, so partially typed symbols never trigger widget loads.
- Memoized widget boundaries avoid reconstruction when unrelated journal or portfolio state changes. Only the selected security is subscribed/displayed; charts mount only on the Markets view.
- IntersectionObserver gates embeds to nearby visible surfaces. Component cleanup removes obsolete frames. The app unloads frames after 30 seconds in a hidden tab and reconnects on return. It cannot control internal provider frame algorithms.
- The direct adapter uses a 15-second bounded (128-item) isolate cache and coalesces concurrent requests by ticker. At most four upstream requests run per isolate; additional requests receive a recoverable 429. This is not a globally coordinated quota; a multi-user release should add shared admission control.
- Direct quote polling runs every 30 seconds only while visible, cancels obsolete requests, and backs off up to five minutes on failure. Missing configuration stops polling. The server uses an eight-second upstream timeout; tokens are sent only in an upstream header and never returned to clients.
- Below-the-fold holdings and allocation sections use content-visibility with intrinsic-size reservations. This skips rendering work, not downloading or JavaScript execution.
- No energy savings or latency improvements have been measured; these are engineering choices derived from platform guidance, not benchmark claims.

## Primary references (2026 or earlier)

1. TradingView widget data FAQ: stock widgets are delayed; paid TradingView subscriptions do not upgrade embedded feeds. https://www.tradingview.com/widget-docs/faq/data/
2. TradingView supported dynamic-symbol integration with Symbol Info and Advanced Chart configurations. https://www.tradingview.com/widget-docs/tutorials/iframe/build-page/dynamic-symbols/
3. TradingView lazy-loading tutorial. https://www.tradingview.com/widget-docs/tutorials/iframe/lazy-loading/
4. Chrome/web.dev, Optimize Interaction to Next Paint (2023 onward): limit main-thread and off-screen rendering work. https://web.dev/articles/optimize-inp
5. Chrome/web.dev, content-visibility (2020 onward): offscreen rendering deferral. https://web.dev/articles/content-visibility
6. MDN Page Visibility API: visibility events for suspending background activity. https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
7. Finnhub quote endpoint and rate limits. https://finnhub.io/docs/api/quote and https://finnhub.io/docs/api/rate-limit
8. Robinhood public security destination format. https://robinhood.com/us/en/stocks/AAPL/

## Verification and next step

Type checking, symbol/link tests, finance tests, and production compilation are run. Browser execution, provider widget rendering, live Finnhub access and performance profiling remain unverified. Add an appropriately entitled Finnhub secret through hosted runtime settings, then verify quote timestamps and provider failures before calling the direct feed real-time. Never put the key in this public GitHub repository.
