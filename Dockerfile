# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS node-base
WORKDIR /app
ENV NODE_ENV=development
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM node-base AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
# Frontend imports Convex generated API files from backend/convex/_generated.
COPY backend/convex/_generated /app/backend/convex/_generated
# Let backend-generated imports resolve packages from frontend's installed deps.
RUN mkdir -p /app/backend && ln -s /app/frontend/node_modules /app/backend/node_modules
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM node-base AS convex
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --no-audit --no-fund
COPY backend/ ./
EXPOSE 3210 3211
CMD ["npm", "run", "dev:backend", "--", "--typecheck=disable"]

FROM python:3.12-slim AS scraper-api
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
COPY services/scraper_api/requirements-scraper.txt ./
RUN pip install --no-cache-dir -r requirements-scraper.txt
COPY services/scraper_api /app/services/scraper_api
EXPOSE 8001
CMD ["uvicorn", "services.scraper_api.main:app", "--host", "0.0.0.0", "--port", "8001"]
