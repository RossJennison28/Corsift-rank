import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel"

const http = httpRouter();

// Add public webhook/httpAction routes here when external systems need to POST to Convex.

type AuditIssue = {
    severity: "low" | "medium" | "high";
    category: "technical" | "content" | "seo";
    title: string;
    description: string;
    pageUrl: string;
};

function getWebhookSecret() {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> }}).process
        ?.env;
    return env?.CRAWL_RESULTS_WEBHOOK_SECRET;
}
function jsonResponse(body: unknown, status: number = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json"},
    });
}
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function getString(value: unknown) {
    return typeof value === "string" ? value : "";
}

function buildIssuesFromWebhookPages(pages: unknown[]): AuditIssue[] {
    const issues: AuditIssue[] = [];

    for (const rawPage of pages) {
        if (!isRecord(rawPage)) continue

        const pageUrl = getString(rawPage.url);
        if(!pageUrl) continue;

        const title = getString(rawPage.title).trim();
        if(!title) {
            issues.push({
                severity: "medium",
                category: "content",
                title: "Missing page title",
                description: "Page has no <title> tag content.",
                pageUrl
            })
        }

        const meta = isRecord(rawPage.meta) ? rawPage.meta : {};
        const description = getString(meta.description).trim();
        if(!description){
            issues.push({
                severity: "medium",
                category: "seo",
                title: "Missing meta description",
                description: "Page is missing meta desription.",
                pageUrl
            });
        }

        const images = Array.isArray(rawPage.images) ? rawPage.images : [];
        const missingAlt = images.reduce((count, image) => {
            if(!isRecord(image)) return count + 1;
            return getString(image.alt).trim() ? count : count + 1;
        }, 0);

        if (missingAlt > 0) {
            issues.push({
                severity: "low",
                category: "content",
                title: "Images missing alt text",
                description: `${missingAlt} image(s) missing alt text.`,
                pageUrl,
            });
        }
    }

    return issues;
}

http.route({
    path: "/webhooks/crawl-results",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const expectedSecret = getWebhookSecret();
        if(!expectedSecret){
            return jsonResponse({ error: "CRAWL_RESULTS_WEBHOOK_SECRET is not configured"}, 500);
        }

        const bearer = request.headers.get("authorization");
        const headerSecret = request.headers.get("x-webhook-secret");
        const token = bearer?.startsWith("Bearer ") ? bearer.slice("Bearer ".length) : headerSecret;
    
        if (token !== expectedSecret) {
            return jsonResponse({ error: "Unauthorized webhook"}, 401);
        }
        
        let body: unknown;

        try {
            body = await request.json();
        }catch {
            return jsonResponse({ error: "Invalid Json payload"}, 400);
        }

        if(!isRecord(body)) {
            return jsonResponse({ error: "body must be an object" }, 400);
        }


        const auditId = getString(body.auditId);
        const status = getString(body.status);
        if (!auditId || (status !== "complete" && status !== "failed")) {
            return jsonResponse({ error: "Expected auditId and status(complete|failed)"}, 400);
        }

        if (status === "failed") {
            await ctx.runMutation(internal.myFunctions.setAuditStatus, {
                auditId: auditId as Id<"audits">,
                status: "failed",
            });
            return jsonResponse({ ok: true });
        }
        const pages = Array.isArray(body.pages) ? body.pages : null;
        if (!pages) {
            return jsonResponse({ error: "Expected pages array when status is complete"}, 400);
        }

        const pagesScanned = 
            typeof body.pages_crawled === "number" && Number.isFinite(body.pages_crawled)
            ? body.pages_crawled
            : pages.length;
        
        const issues = buildIssuesFromWebhookPages(pages);

        await ctx.runMutation(internal.myFunctions.completeAudit, {
            auditId: auditId as Id<"audits">,
            issues,
            pagesScanned,
        });

        return jsonResponse({ ok: true });
    }),
});

export default http;
