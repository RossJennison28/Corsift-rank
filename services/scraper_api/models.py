from pydantic import BaseModel, HttpUrl

# Request payload accepted by the crawler endpoint.
class UrlCrawl(BaseModel):
    start_url: HttpUrl
    max_pages: int = 500
    max_depth: int = 2
    same_domain_only: bool = True
    include_subdomains: bool = False
    audit_id: str