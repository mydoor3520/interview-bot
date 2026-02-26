/**
 * set-admin.ts - CLI script to grant admin privileges to a user
 *
 * Usage:
 *   npx tsx scripts/set-admin.ts <email>
 *   npx tsx scripts/set-admin.ts --revoke <email>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  let revoke = false;
  let email: string | undefined;

  for (const arg of args) {
    if (arg === '--revoke') {
      revoke = true;
    } else if (!arg.startsWith('--')) {
      email = arg;
    }
  }

  if (!email) {
    console.error('Usage: npx tsx scripts/set-admin.ts [--revoke] <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, isAdmin: true },
  });

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  if (revoke) {
    if (!user.isAdmin) {
      console.log(`User ${email} is already not an admin.`);
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: false },
    });

    console.log(`Admin privileges revoked for: ${email}`);
  } else {
    if (user.isAdmin) {
      console.log(`User ${email} is already an admin.`);
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true },
    });

    console.log(`Admin privileges granted to: ${email}`);
  }
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
