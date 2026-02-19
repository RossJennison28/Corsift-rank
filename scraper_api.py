from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Any
from bs4 import BeautifulSoup, Tag
import requests
from urllib.parse import urljoin
app = FastAPI()

class ReviewRequest(BaseModel):
    url: HttpUrl

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/review-url")
def review_url(body: ReviewRequest) -> dict[str, Any]:
    try:
        response = requests.get(
            str(body.url),
            timeout=10,
            headers={"User-Agent": "CorsiftBot/1.0"}
        )
        response.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")
    
    soup = BeautifulSoup(response.text, "lxml")

    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else "No title found"

    meta_desc_tag = soup.find("meta", attrs={"name": "description"})
    meta_description = ""
    if isinstance(meta_desc_tag, Tag):
        content = meta_desc_tag.get("content", "")
        if isinstance(content, str):
            meta_description = content.strip()

    h1: list[str] = []
    for h1_tag in soup.find_all("h1"):
        if isinstance(h1_tag, Tag):
            h1.append(h1_tag.get_text("", strip=True))
    
    links: list[str] = []
    for a_tag in soup.select("a", href=True):
        if not isinstance(a_tag, Tag):
            continue
        href = a_tag["href"]
        if isinstance(href, str) and href:
            links.append(urljoin(str(body.url), href.strip()))
    
    return {
        "url": str(body.url),
        "title": title,
        "meta_description": meta_description,
        "h1": h1,
        "link_count": len(links),
        "sample_links": links[:10]
    }