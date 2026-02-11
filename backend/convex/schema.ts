import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
const schema = defineSchema({
  ...authTables,
});

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
});
