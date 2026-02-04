import { Prisma, PrismaClient } from "@prisma/client";

// Reference to the base PrismaClient for soft-delete update calls.
// Set by prisma.ts after initialization.
let basePrisma: PrismaClient;

export function setBasePrisma(client: PrismaClient) {
  basePrisma = client;
}

function addDeletedAtFilter(where: Prisma.InterviewSessionWhereInput | undefined): Prisma.InterviewSessionWhereInput {
  if (!where) return { deletedAt: null };
  if (where.deletedAt === undefined) {
    return { ...where, deletedAt: null };
  }
  return where;
}

/**
 * Prisma client extension that automatically handles soft-delete for InterviewSession.
 * - Read queries (findMany, findFirst, count): adds `deletedAt: null` filter
 * - Delete operations: converts to update with `deletedAt: new Date()`
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: "soft-delete",
  query: {
    interviewSession: {
      async findMany({ args, query }) {
        args.where = addDeletedAtFilter(args.where) as typeof args.where;
        return query(args);
      },
      async findFirst({ args, query }) {
        args.where = addDeletedAtFilter(args.where) as typeof args.where;
        return query(args);
      },
      async findUnique({ args, query }) {
        // Check deletedAt after query to filter soft-deleted records
        const result = await query(args);
        if (result && (result as { deletedAt?: Date | null }).deletedAt !== null) {
          return null;
        }
        return result;
      },
      async count({ args, query }) {
        args.where = addDeletedAtFilter(args.where) as typeof args.where;
        return query(args);
      },
      async delete({ args }: { args: { where: Prisma.InterviewSessionWhereUniqueInput } }) {
        return basePrisma.interviewSession.update({
          where: args.where,
          data: { deletedAt: new Date() },
        }) as unknown;
      },
      async deleteMany({ args }: { args: { where?: Prisma.InterviewSessionWhereInput } }) {
        return basePrisma.interviewSession.updateMany({
          where: args.where,
          data: { deletedAt: new Date() },
        }) as unknown;
      },
    },
  },
});
