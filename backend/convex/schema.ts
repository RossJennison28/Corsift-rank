import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// All tables have been defined below.
// Need to at .indexes() to any field that will be commonly queried against for better performance.

export default defineSchema({
  ...authTables,
  userProfiles: defineTable({
    userId: v.id("users"),
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("pro")),
    subscriptionStatus: v.union(v.literal("inactive"), v.literal("trialing"), v.literal("active"), v.literal("past_due"), v.literal("canceled")),
    onboardingComplete: v.boolean(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
  .index("byUserId", ["userId"])
  .index("byStripeCustomerId", ["stripeCustomerId"])
  .index("byStripeSubscriptionId", ["stripeSubscriptionId"]),

  sites: defineTable({
    userId: v.id("users"),
    url: v.string(),
    name: v.string(),
    cmsType: v.union(v.literal("wordpress"), v.literal("shopify"), v.null()),
    vaultObjectId: v.optional(v.string()),
    hasCmsCredentials: v.boolean(),
    gscConnected: v.boolean(),
    gscPropertyUrl: v.optional(v.string()),
    healthScore: v.optional(v.number()),
    lastAuditAt: v.optional(v.number()),
    lastAuditId: v.optional(v.id("audits")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("byUserId", ["userId"])
  .index("byUserIdAndUrl", ["userId", "url"]),

  audits: defineTable({
    siteId: v.id("sites"),
    status: v.union(v.literal("pending"), v.literal("crawling"), v.literal("analysing"), v.literal("complete"), v.literal("failed")),
    pagesScanned: v.optional(v.number()),
    healthScore: v.optional(v.number()),
    technicalScore: v.optional(v.number()),
    contentScore: v.optional(v.number()),
    issues: v.array(v.object({
      severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      category: v.union(v.literal("technical"), v.literal("content"), v.literal("seo")),
      title: v.string(),
      description: v.string(),
      pageUrl: v.string(),
    })),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("bySiteId", ["siteId"])
  .index("bySiteIdAndCompletedAt", ["siteId", "completedAt"])
  .index("bySiteIdAndCreatedAt", ["siteId", "createdAt"]),
  
  actionPlans: defineTable({
    siteId: v.id("sites"),
    weekStart: v.string(),
    items: v.array(v.object({
      type: v.union(v.literal("technical"), v.literal("content"), v.literal("seo")),
      priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      title: v.string(),
      description: v.string(),
      impact: v.string(),
      status : v.union(v.literal("to-do"), v.literal("in-progress"), v.literal("done")),
      contentId: v.union(v.null(), v.id("content")),
    })),
    generatedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("bySiteId", ["siteId"])
  .index("bySiteIdAndWeekStart", ["siteId", "weekStart"]),

  content: defineTable({
    siteId: v.id("sites"),
    title: v.string(),
    slug: v.string(),
    metaDescription: v.string(),
    body: v.string(),
    targetKeywords: v.array(v.string()),
    status : v.union(v.literal("draft"), v.literal("review"), v.literal("published")),
    cmsPostId: v.union(v.null(), v.string()),
    publishedAt: v.optional(v.number()),
    wordCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("bySiteId", ["siteId"])
  .index("bySiteIdAndSlug", ["siteId", "slug"]),

  rankings: defineTable({
    siteId: v.id("sites"),
    keyword: v.string(),
    position: v.number(),
    previousPosition: v.optional(v.number()),
    url: v.string(),
    searchVolume: v.optional(v.number()),
    checkedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("bySiteIdAndKeyword", ["siteId", "keyword"])
  .index("bySiteIdAndCheckedAt", ["siteId", "checkedAt"]),
});
