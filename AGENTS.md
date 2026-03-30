# AGENTS.md

## Project
A small currency converter website (為替換算サイト) focused on fast launch and simple maintenance.

## Product goal
Build a one-page currency converter that solves the user's task in a few seconds.
The first version should stay minimal, fast, and mobile-friendly.

## Technical framework
- Frontend: HTML, CSS, JavaScript
- App type: Static website
- Deployment target: Azure Static Web Apps
- CI/CD: GitHub Actions
- Repository: Single repo
- Runtime: No backend by default
- Data source: Public exchange-rate API
- State management: Local browser state only if needed
- Storage/DB: Do not add a database unless explicitly requested

## Architecture constraints
- Keep the first version as a single-page application
- Prefer static-first design
- Do not introduce a backend unless there is a clear requirement
- Do not introduce authentication
- Do not introduce a database
- Do not introduce containers, Kubernetes, or App Service unless explicitly requested
- Do not split into frontend/backend repos
- Keep deployment simple: one production environment only

## Supported currencies for MVP
- JPY
- CNY
- USD
- EUR

## MVP features
- Enter amount
- Select source currency
- Select target currency
- Show converted result immediately
- Swap source/target currencies
- Show latest update timestamp
- Show disclaimer that rates are reference values only

## Non-goals for MVP
- Historical charts
- User accounts
- Favorites sync
- Exchange alerts
- Admin panel
- Ads system
- Multi-environment setup
- Complex SEO work
- Payment or fee simulation unless explicitly requested

## Repo layout
- `src/` : application files
- `.github/workflows/` : CI/CD workflows
- `README.md` : setup and deployment notes
- `AGENTS.md` : repository-level instructions for Codex

## Commands
- Local run: use a simple static server
- Build: no heavy build step unless explicitly added later
- Test: add lightweight tests only when needed
- Deploy: GitHub Actions -> Azure Static Web Apps

## UI rules
- Mobile-first
- One screen for the main conversion flow
- Large input and result display
- Keep interactions obvious and low-friction
- Avoid unnecessary animations and visual complexity

## Coding rules
- Keep files small and readable
- Prefer simple JavaScript over unnecessary framework complexity
- Do not add large dependencies without clear value
- Preserve a clean one-page structure
- Use clear variable names and minimal abstraction

## Data/API rules
- Prefer a free public API with simple integration
- Handle API failure gracefully
- Show last updated time when available
- Always keep a disclaimer that displayed rates are reference values only

## Definition of done
A task is done only when:
- the app still works as a simple static site
- the core conversion flow works
- the UI remains mobile-friendly
- deployment is not made more complex unnecessarily
- documentation or comments are updated if the structure changes