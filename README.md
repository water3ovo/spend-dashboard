# Spend Dashboard

AE / SA / MX Amazon advertising spend pacing dashboard.

## Architecture

- Static frontend hosted on Cloudflare Pages
- Supabase Auth for login
- Supabase PostgreSQL / RPC for shared dashboard state
- Role model: admin / editor / viewer
- Country permissions: AE / SA / MX
- Lingxing Excel import in browser

## Deployment

Deploy the repository root as a static site. No build command is required.
