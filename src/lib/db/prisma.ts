import { PrismaClient } from "@prisma/client";
import { softDeleteExtension, setBasePrisma } from "./soft-delete";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  prismaBase: PrismaClient | undefined;
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

  // base PrismaClient를 글로벌에 저장 (AIUsageLog 등 확장 미적용 모델 접근용)
  globalForPrisma.prismaBase = base;

  return base.$extends(softDeleteExtension);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** soft-delete 확장 미적용 기본 PrismaClient (AIUsageLog 등에서 사용) */
export const prismaBase = globalForPrisma.prismaBase!;

export type ExtendedPrismaClient = typeof prisma;
