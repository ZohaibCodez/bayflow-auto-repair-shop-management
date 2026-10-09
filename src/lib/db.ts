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
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
