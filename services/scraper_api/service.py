from collections import deque
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urldefrag, urljoin, urlunparse
import requests

# Normalizes URLs so duplicates are easier to detect while crawling.
def normalize_url(raw_url: str) -> str:
    no_fragment, _ = urldefrag(raw_url)
    p = urlparse(no_fragment)
    path = p.path or "/"
    return urlunparse((p.scheme, p.netloc.lower(), path.rstrip("/") or "/", "", "", ""))


def same_site(url: str, root_host:str, include_subdomains: bool) -> bool:
    host = urlparse(url).netloc.lower()
    if include_subdomains:
        return host == root_host or host.endswith("." + root_host)
    return host == root_host

def meta_by_name(soup, name: str) -> str:
    tag = soup.select_one(f'meta[name="{name}"]')
    value = tag.get("content") if tag else None
    return value.strip() if isinstance(value, str) else ""

def meta_by_property(soup, prop: str) -> str:
    tag = soup.select_one(f'meta[property="{prop}"]')
    value = tag.get("content") if tag else None
    return value.strip() if isinstance(value, str) else ""


# Breadth-first crawl constrained by page limit + depth.
def crawl_site(start_url: str, max_pages: int, max_depth: int, include_subdomains: bool, same_domain_only: bool):
    root = normalize_url(start_url)
    root_host = urlparse(root).netloc.lower()

    queue = deque([(root, 0)])  # (url, depth)
    visited = set()
    pages = []

    while queue and len(pages) < max_pages:
        current_url, depth = queue.popleft()
        current_url = normalize_url(current_url)

        if current_url in visited:
            continue
        visited.add(current_url)

        if depth > max_depth:
            continue

        if not same_site(current_url, root_host, include_subdomains) and same_domain_only:
            continue

        try:
            # Skip non-HTML and unreachable URLs early.
            r = requests.get(current_url, timeout=10, headers={"User-Agent": "CorsiftBot/1.0"})
            r.raise_for_status()
            if "text/html" not in r.headers.get("Content-Type", ""):
                continue
        except requests.RequestException:
            continue

        soup = BeautifulSoup(r.text, "lxml")

        title = soup.title.get_text(strip=True) if soup.title else ""
        headings = [h.get_text("", strip=True) for h in soup.select("h1,h2,h3,h4,h5,h6")]
        images = []
        for img in soup.select("img[src]"):
            src = img.get("src")
            alt = img.get("alt", "")
            if isinstance(src, str) and src.strip():
                images.append({
                    "src": urljoin(current_url, src.strip()),
                    "alt": alt if isinstance(alt, str) else ""
                })
        links = []

        for a in soup.select("a[href]"):
            href = a.get("href")
            if not isinstance(href, str) or not href.strip():
                continue

            abs_url = normalize_url(urljoin(current_url, href.strip()))
            links.append(abs_url)

            if depth < max_depth and abs_url not in visited:
                if (not same_domain_only) or same_site(abs_url, root_host, include_subdomains):
                    queue.append((abs_url, depth + 1))


        canonical_tag = soup.select_one('link[rel="canonical"]')
        canonical = canonical_tag.get("href") if canonical_tag else None
        canonical = canonical.strip() if isinstance(canonical, str) else ""

        meta = {
            "description": meta_by_name(soup, "description"),
            "robots": meta_by_name(soup, "robots"),
            "canonical": canonical,
            "og": {
                "title": meta_by_property(soup, "og:title"),
                "description": meta_by_property(soup, "og:description"),
                "image": meta_by_property(soup, "og:image"),
            },
            "twitter": {
                "card": meta_by_name(soup, "twitter:card"),
                "title": meta_by_name(soup, "twitter:title"),
                "description": meta_by_name(soup, "twitter:description"),
            },
        }

                
        pages.append({
            "url": current_url,
            "title": title,
            "headings": headings,
            "images": images,
            "links": links,
            "meta": meta
        })

    # Response shape is consumed directly by the Convex action layer and frontend.
    return { "start_url": root, "pages_crawled": len(pages), "visited_count": len(visited), "pages": pages }
