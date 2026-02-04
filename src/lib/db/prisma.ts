import { PrismaClient } from "@prisma/client";
import { softDeleteExtension, setBasePrisma } from "./soft-delete";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Log connection errors
  base.$connect().catch((err) => {
    console.error('Failed to connect to database:', err);
  });

  setBasePrisma(base);

  return base.$extends(softDeleteExtension);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type ExtendedPrismaClient = typeof prisma;
