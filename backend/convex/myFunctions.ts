import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";

type AuditIssue = {
  severity: "low" | "medium" | "high";
  category: "technical" | "content" | "seo";
  title: string;
  description: string;
  pageUrl: string;
};

type CrawlPage = {
  url: string;
  title: string;
  headings: string[];
  images: Array<{ src: string; alt: string }>;
  links: string[];
  meta: {
    description: string;
    robots: string;
    canonical: string;
    og?: {
      title?: string;
      description?: string;
      image?: string;
    };
    twitter?: {
      card?: string;
      title?: string;
      description?: string;
    };
  };
};

type CrawlResponse = {
  start_url: string;
  pages_crawled: number;
  visited_count: number;
  pages: CrawlPage[];
};

type StartUrlReviewWithDetailsResult = {
  auditId: Id<"audits">;
  siteId: Id<"sites">;
  crawl: CrawlResponse;
};

async function createAuditForUser(
  db: MutationCtx["db"],
  userId: Id<"users">,
  url: string
) {
  const now = Date.now();
  const normalizedUrl = url.trim();

  let site = await db
    .query("sites")
    .withIndex("byUserIdAndUrl", (q) => q.eq("userId", userId).eq("url", normalizedUrl))
    .unique();

  if (!site) {
    const siteId = await db.insert("sites", {
      userId,
      url: normalizedUrl,
      name: normalizedUrl,
      cmsType: null,
      hasCmsCredentials: false,
      gscConnected: false,
      createdAt: now,
      updatedAt: now,
    });
    site = await db.get("sites", siteId);
    if (!site) throw new Error("Failed to create site");
  }

  const auditId = await db.insert("audits", {
    siteId: site._id,
    status: "pending",
    issues: [],
    createdAt: now,
    updatedAt: now,
  });

  await db.patch("sites", site._id, {
    lastAuditId: auditId,
    lastAuditAt: now,
    updatedAt: now,
  });

  return { auditId, siteId: site._id, normalizedUrl };
}

function getScraperApiUrl() {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  const scraperApiUrl = env?.SCRAPER_API_URL;

  if (!scraperApiUrl) {
    throw new Error("SCRAPER_API_URL is not configured");
  }

  return scraperApiUrl;
}

async function crawlSite(startUrl: string): Promise<CrawlResponse> {
  const response = await fetch(`${getScraperApiUrl()}/crawl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start_url: startUrl,
      max_pages: 500,
      max_depth: 2,
      same_domain_only: true,
      include_subdomains: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Crawler failed: ${response.status}`);
  }

  return (await response.json()) as CrawlResponse;
}

function buildIssuesFromPages(pages: CrawlPage[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const page of pages) {
    if (!page.title?.trim()) {
      issues.push({
        severity: "medium",
        category: "content",
        title: "Missing page title",
        description: "Page has no <title> tag content.",
        pageUrl: page.url,
      });
    }

    if (!page.meta?.description?.trim()) {
      issues.push({
        severity: "medium",
        category: "seo",
        title: "Missing meta description",
        description: "Page is missing meta description.",
        pageUrl: page.url,
      });
    }

    const missingAlt = page.images.filter((img) => !img.alt?.trim()).length;
    if (missingAlt > 0) {
      issues.push({
        severity: "low",
        category: "content",
        title: "Images missing alt text",
        description: `${missingAlt} image(s) missing alt text.`,
        pageUrl: page.url,
      });
    }
  }

  return issues;
}

export const getUserProfile = query({
  args: { userId: v.id("users") },
  handler: async ({ db }, { userId }) => {
    const profile = await db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) {
      throw new Error("User profile not found");
    }

    return profile;
  },
});

export const createAuditRecord = internalMutation({
  args: {
    userId: v.id("users"),
    url: v.string(),
  },
  handler: async ({ db }, { userId, url }) => {
    return await createAuditForUser(db, userId, url);
  },
});

export const startUrlReview = mutation({
  args: {
    url: v.string(),
  },
  handler: async ({ db, scheduler, auth }, { url }) => {
    const userId = await getAuthUserId({ auth });
    if (!userId) {
      throw new Error("User is not authenticated");
    }

    const created = await createAuditForUser(db, userId, url);

    await scheduler.runAfter(0, internal.myFunctions.runUrlReview, {
      auditId: created.auditId,
      startUrl: created.normalizedUrl,
    });

    return { auditId: created.auditId, siteId: created.siteId };
  },
});

export const startUrlReviewWithDetails = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, { url }): Promise<StartUrlReviewWithDetailsResult> => {
    const userId = await getAuthUserId({ auth: ctx.auth });
    if (!userId) {
      throw new Error("User is not authenticated");
    }

    const created: {
      auditId: Id<"audits">;
      siteId: Id<"sites">;
      normalizedUrl: string;
    } = await ctx.runMutation(internal.myFunctions.createAuditRecord, {
      userId,
      url,
    });

    try {
      await ctx.runMutation(internal.myFunctions.setAuditStatus, {
        auditId: created.auditId,
        status: "crawling",
      });

      const crawl = await crawlSite(created.normalizedUrl);

      await ctx.runMutation(internal.myFunctions.setAuditStatus, {
        auditId: created.auditId,
        status: "analysing",
      });

      const issues = buildIssuesFromPages(crawl.pages);

      await ctx.runMutation(internal.myFunctions.completeAudit, {
        auditId: created.auditId,
        issues,
        pagesScanned: crawl.pages_crawled,
      });

      return {
        auditId: created.auditId,
        siteId: created.siteId,
        crawl,
      };
    } catch (error) {
      await ctx.runMutation(internal.myFunctions.setAuditStatus, {
        auditId: created.auditId,
        status: "failed",
      });

      if (error instanceof Error) {
        throw error;
      }
      throw new Error("URL review failed");
    }
  },
});

export const getAudit = query({
  args: {
    auditId: v.id("audits"),
  },
  handler: async ({ db, auth }, { auditId }) => {
    const userId = await getAuthUserId({ auth });
    if (!userId) {
      throw new Error("User is not authenticated");
    }

    const audit = await db.get("audits", auditId);
    if (!audit) {
      return null;
    }

    const site = await db.get("sites", audit.siteId);
    if (!site || site.userId !== userId) {
      throw new Error("Audit not found");
    }

    return { audit, site };
  },
});

export const completeAudit = internalMutation({
  args: {
    auditId: v.id("audits"),
    pagesScanned: v.number(),
    issues: v.array(
      v.object({
        severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        category: v.union(v.literal("technical"), v.literal("content"), v.literal("seo")),
        title: v.string(),
        description: v.string(),
        pageUrl: v.string(),
      })
    ),
  },
  handler: async ({ db }, { auditId, issues, pagesScanned }) => {
    await db.patch("audits", auditId, {
      status: "complete",
      issues,
      pagesScanned,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const setAuditStatus = internalMutation({
  args: {
    auditId: v.id("audits"),
    status: v.union(
      v.literal("pending"),
      v.literal("crawling"),
      v.literal("analysing"),
      v.literal("complete"),
      v.literal("failed")
    ),
  },
  handler: async ({ db }, { auditId, status }) => {
    await db.patch("audits", auditId, {
      status,
      updatedAt: Date.now(),
    });
  },
});

export const runUrlReview = internalAction({
  args: {
    auditId: v.id("audits"),
    startUrl: v.string(),
  },
  handler: async (ctx, { auditId, startUrl }) => {
    try {
      await ctx.runMutation(internal.myFunctions.setAuditStatus, {
        auditId,
        status: "crawling",
      });

      const crawl = await crawlSite(startUrl);

      await ctx.runMutation(internal.myFunctions.setAuditStatus, {
        auditId,
        status: "analysing",
      });

      const issues = buildIssuesFromPages(crawl.pages);

      await ctx.runMutation(internal.myFunctions.completeAudit, {
        auditId,
        issues,
        pagesScanned: crawl.pages_crawled,
      });
    } catch {
      await ctx.runMutation(internal.myFunctions.setAuditStatus, {
        auditId,
        status: "failed",
      });
    }
  },
});
