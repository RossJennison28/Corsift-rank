### Run the full stack with Docker Compose

Start all services:

```bash
docker compose up --build
```

This starts:

- `frontend` on `http://localhost:5173`
- `scraper-api` on `http://localhost:8001`
- `convex` on `http://localhost:3210` (and `3211`)

### Environment overrides

Optional overrides:

- `VITE_CONVEX_URL` (default: `http://localhost:3210`)
- `VITE_API_PROXY_TARGET` (default in compose: `http://scraper-api:8001`)

Example:

```bash
VITE_CONVEX_URL=http://localhost:3210 docker compose up --build
```
