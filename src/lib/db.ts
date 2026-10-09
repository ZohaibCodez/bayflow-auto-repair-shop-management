import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot reloads in dev, so we don't exhaust
// the database connection pool. In production a fresh client per instance is fine.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
    // Workflow steps run as interactive transactions. Against a remote Neon region each
    // round trip can be ~200ms locally, so allow more than Prisma's 5s default.
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
