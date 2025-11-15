# SoukSoft

SoukSoft is a modern point-of-sale and back-office dashboard for North African retailers. It combines a cashier workflow, catalog administration, expiration monitoring, and audit logging in a single responsive interface. The project doubles as a Tauri desktop app, so it runs offline-first while persisting data in the browser sandbox.

## Feature Highlights
- **Counter** – Barcode-driven basket management with keyboard shortcuts, manual overrides, and real-time totals.
- **Catalog insights** – Filterable All Items view with low-stock flags, inventory snapshots, and export/import support.
- **Product Builder** – Local product registry with CSV import/export, batch edits, per-field diffing, and audit logging.
- **Expiring items** – Shelf-life tracking that recommends promotions and writes queued markdowns to storage.
- **Audit history & settings** – Purchase log exploration, undo tracking, and operator profile controls with theme support.

## Tech Stack
- React 19 + TypeScript, Vite, and pnpm for the SPA shell.
- Tailwind + shadcn/ui primitives for composable UI components.
- Lucide icons and Radix primitives for consistent interactions.
- Local storage as the lightweight persistence layer, exposed via helper modules so future backends can replace it.
- Optional Tauri wrapper (see `src-tauri`) for packaging the same UI as a desktop register.

## Project Structure
```
├── src
│   ├── App.tsx                # Entry point that routes between dashboard sections
│   ├── components/            # Theme provider, shared UI primitives, summary widgets
│   ├── data/mockData.ts       # Seed data for products, navigation, history, etc.
│   ├── lib/                   # Storage helpers, formatting utilities, audit logger
│   ├── pages/                 # Feature pages (Counter, ProductBuilder, ExpiringProducts…)
│   ├── styles.css             # Tailwind entrypoint
│   └── types.ts               # Shared domain types
├── src-tauri/                 # Optional desktop shell configuration
├── public/                    # Static assets
└── dist/                      # Production build output (ignored by linting)
```

## Getting Started
### Prerequisites
- Node.js 18+
- pnpm `>=8` (preferred – see `pnpm-lock.yaml`)

### Install & Run
```bash
pnpm install          # install dependencies
pnpm dev              # start Vite dev server
pnpm build            # type-check + production bundle
pnpm preview          # preview the production build
pnpm lint             # run Biome lint rules
pnpm format           # apply Biome formatting
```

To run inside the desktop shell, install the Tauri tooling (`pnpm tauri dev`) after following the platform-specific prerequisites from [tauri.app](https://tauri.app/).

## Data Persistence
- `souksoft-products` – canonical product catalog (synced via custom `souksoft:products-updated` events).
- `souksoft-audit-log` – audit trail emitted by the builder/import flows.
- `souksoft-promotions` – queued markdowns for expiring products.
- `souksoft-active-user`, `souksoft-accounts`, `souksoft-user-default-section-prefs` – authentication cache per device.

All helpers live in `src/lib/*Storage.ts` and abstract serialization + event dispatch, which keeps React components simple and paves the way for swapping storage for a backend API later on.

## Development Notes
- The UI is fully client-side; SSR is not enabled. Guard browser-only APIs with `typeof window !== "undefined"` when adding new features.
- When extending storage helpers, dispatch custom events so other sections can react without manual refresh buttons.
- Biome linting ignores `dist/**` and `node_modules/**` so generated bundles never block CI.

## Contributing
1. Fork or branch off `main`.
2. Keep PRs focused (feature, bugfix, doc update).
3. Add or update tests when feasible; run `pnpm lint` + `pnpm build` locally before pushing.
4. Describe UX changes with screenshots or screen recordings when relevant.

Questions or ideas? Open an issue describing the scenario, current behavior, and proposed change so the roadmap can stay aligned with real store workflows.
