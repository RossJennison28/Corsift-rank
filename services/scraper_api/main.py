import os
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .service import crawl_site
from .models import UrlCrawl

app = FastAPI()


def get_allowed_origins() -> list[str]:
    raw_origins = os.getenv(
        "SCRAPER_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

def send_crawl_webhook(payload: dict) -> None:
    webhook_url = os.getenv("CONVEX_WEBHOOK_URL")
    secret = os.getenv("CRAWL_RESULTS_WEBHOOK_SECRET")

    if not webhook_url or not secret:
        print("Webhook env vars missing; skipping webhook send")
        return
    
    try:
        res = requests.post(
            webhook_url,
            json=payload,
            headers={
                "Authorization": f"Bearer {secret}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        res.raise_for_status()
    except requests.RequestException as err:
        print(f"Webhook send failed: {err}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/crawl")
def crawl_url(body: UrlCrawl):

    audit_id = body.audit_id
    try:
        crawl =  crawl_site(
            start_url=str(body.start_url),
            max_pages=body.max_pages,
            max_depth=body.max_depth,
            include_subdomains=body.include_subdomains,
            same_domain_only=body.same_domain_only
        )

        send_crawl_webhook({
            "auditId": audit_id,
            "status":"complete",
            "pages_crawled": crawl["pages_crawled"],
            "visited_count": crawl["visited_count"],
            "pages": crawl["pages"],
        })

        return crawl
    except Exception as err:
        send_crawl_webhook({
            "auditId": audit_id,
            "status": "failed",
            "error": str(err),
        })
        raise HTTPException(status_code=500, detail="Crawl failed")
        
    
