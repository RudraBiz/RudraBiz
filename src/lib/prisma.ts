import { PrismaClient } from "@prisma/client";

// Standard Next.js singleton pattern — prevents creating a new
// Prisma Client instance on every hot-reload in development.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
