import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, mutation, query, type MutationCtx } from "./_generated/server";

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


// Creates or reuses a site for this user, then creates a pending audit record.
async function createAuditForUser(
  db: MutationCtx["db"],
  userId: string,
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

// Reads the scraper API base URL from Convex action environment variables.
function getScraperApiUrl() {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  const scraperApiUrl = env?.SCRAPER_API_URL;

  if (!scraperApiUrl) {
    throw new Error("SCRAPER_API_URL is not configured");
  }

  return scraperApiUrl;
}

async function crawlSite(startUrl: string, auditId: string): Promise<CrawlResponse> {
  const response = await fetch(`${getScraperApiUrl()}/crawl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start_url: startUrl,
      max_pages: 500,
      max_depth: 2,
      same_domain_only: true,
      include_subdomains: false,
      audit_id: auditId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Crawler failed: ${response.status}`);
  }

  return (await response.json()) as CrawlResponse;
}

// Ensures each authenticated user has exactly one profile document.
export const checkUserProfile = mutation({
  args: {},
  handler: async( {db, auth }) => {
    const identity = await auth.getUserIdentity();
    const userId = identity?.subject;
    if(!userId) throw new Error("User is not authenticated")

    const existing = await db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .unique(); 

    if (existing) return existing;

    const now = Date.now();
    const profileId = await db.insert("userProfiles", {
      userId,
      plan: "default",
      subscriptionStatus: "inactive",
      onboardingComplete: false,
      createdAt:now,
      updatedAt:now,
    });

    return await db.get("userProfiles", profileId);

    },
});

// Returns the current authenticated user's profile only.
export const getUserProfile = query({
  args:{},
  handler: async ({ auth, db}) => {
    const identity = await auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) {
      throw new Error("Account not authenticated");
    }
    const profile = await db
    .query("userProfiles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

    if(!profile) {
      throw new Error("User profile not found")
    }

    return profile;
  },
});

// Internal helper used by actions to create audit records with explicit userId.
export const createAuditRecord = internalMutation({
  args: {
    userId: v.string(),
    url: v.string(),
  },
  handler: async ({ db }, { userId, url }) => {
    return await createAuditForUser(db, userId, url);
  },
});

// Starts an asynchronous review run and returns identifiers immediately.
export const startUrlReview = mutation({
  args: {
    url: v.string(),
  },
  handler: async ({ db, scheduler, auth }, { url }) => {
    const identity = await auth.getUserIdentity();
    const userId = identity?.subject;
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

// Fetches one audit if it belongs to the authenticated user.
export const getAudit = query({
  args: {
    auditId: v.id("audits"),
  },
  handler: async ({ db, auth }, { auditId }) => {
    const identity = await auth.getUserIdentity();
    const userId = identity?.subject;
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

// Finalizes an audit with computed issues and page counts.
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

// Shared status patch used by both sync and scheduled review flows.
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

// Background runner used when reviews are scheduled via scheduler.runAfter.
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
      
      await crawlSite(startUrl, auditId);

    } catch {
      await ctx.runMutation(internal.myFunctions.setAuditStatus, {
        auditId,
        status: "failed",
      });
    }
  },
});
