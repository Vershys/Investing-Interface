# Design rationale

The visual direction is an understated defense-contractor research terminal: graphite surfaces, olive focus color, monospaced metadata, restrained shield identity, thin rules, and financial graphs as the dominant working surface. No decorative background imagery competes with data. Exact palette and layout choices are hypotheses, not neurological facts.

## Research-to-design mapping

- Hu et al. (2024), selective attention and memory: separate overview, research, scenarios and journal into task-oriented views. This is an inference from a laboratory study, not direct website validation. https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3002721
- Semizer and Rosenholtz (2025), background clutter and visual search: limit competing surface textures and visual variation. Evidence was collected in video-conferencing tasks. https://link.springer.com/article/10.1186/s41235-025-00643-4
- FCA (2024), trading-app engagement experiment: emphasize research actions and comprehension rather than rewards for trading frequency. https://www.fca.org.uk/publications/fca-research/research-note-digital-engagement-practices-trading-apps-experiment
- Stokes et al. (2024), uncertainty communication: pair scenario values with explicit assumptions; never label hypothetical scenarios as statistical confidence intervals. https://arxiv.org/abs/2408.08438
- WCAG 2.2: semantic controls, keyboard access, visible focus, non-color labels, responsive layout and reduced-motion support. https://www.w3.org/TR/WCAG22/

## Data presentation

Use straight segments for synthetic time series; normalized comparisons share their starting value. Exact underlying values are available through the data table and CSV. Daily contributions reconcile to prior-close position values with fixed shares in the sample. Research source links are explicitly unverified starting points. Every portfolio surface is identified as demonstration data.

Recharts was selected for this initial implementation because it is already installed and supports the requested time-series surface and accessibility layer. More involved candlestick and large-history interaction can be evaluated with Lightweight Charts when real market data is added; preserve required vendor attribution.

## Evaluation tasks

Find the largest daily contributor, distinguish synthetic return from actual investment performance, locate an evidence source, explain an assumption change, and save/retrieve a decision. Measure task accuracy alongside speed. A predicted saliency heatmap is not evidence of comprehension.

## Motion and progressive disclosure / September 2026

Page changes use the browser's same-document View Transition API, progressively enhanced with a short directional horizontal transition scoped to main content. Navigation and the market sidebar remain stationary. New navigation skips an in-progress transition; reduced-motion preferences disable movement. No animation library or continuously running animation loop is added. Inline holdings use the existing Radix Collapsible primitive with height animation and keyboard-operated triggers; collapse returns focus to the position trigger.

The design follows [web.dev's SPA transition guidance (August 2025)](https://web.dev/learn/css/view-transitions-spas) and [Chrome's same-document implementation guidance](https://developer.chrome.com/docs/web-platform/view-transitions/same-document). Motion communicates the location of a view change; it does not animate or exaggerate price changes. These are implementation and accessibility sources, not evidence that a particular animation improves financial decisions.

Validation: TypeScript checking, production build and finance/lookup regression tests. Provider-hosted widget appearance and interaction motion have not been visually tested in a browser during this update; live native-provider integration still requires credentials.
