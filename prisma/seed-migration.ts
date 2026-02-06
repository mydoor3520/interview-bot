import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found. Skipping password setup.');
    return;
  }

  if (user.passwordHash) {
    console.log(`User ${user.email} already has a password set. Skipping.`);
    return;
  }

  const password = process.env.INITIAL_USER_PASSWORD;
  if (!password) {
    throw new Error(
      'INITIAL_USER_PASSWORD environment variable is required.\n' +
      'Usage: INITIAL_USER_PASSWORD=your_password npx tsx prisma/seed-migration.ts'
    );
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
      emailVerified: true,
    },
  });

  console.log(`User ${user.email} password set successfully.`);
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
