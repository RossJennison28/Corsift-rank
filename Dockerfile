# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS node-base
WORKDIR /app
ENV NODE_ENV=development

FROM node-base AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
# Frontend imports Convex generated API files from backend/convex/_generated.
COPY backend/convex/_generated /app/backend/convex/_generated
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
COPY requirements-scraper.txt ./
RUN pip install --no-cache-dir -r requirements-scraper.txt
COPY scraper_api.py ./
EXPOSE 8001
CMD ["uvicorn", "scraper_api:app", "--host", "0.0.0.0", "--port", "8001"]
