import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email';
import { emailTemplates } from '@/lib/email/templates';

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}` && request.headers.get('x-cron-secret') !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const users = await prisma.user.findMany({
    where: {
      emailNotifications: true,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, email: true },
  });

  let sent = 0;

  for (const user of users) {
    if (!user.email) continue;

    const sessions = await prisma.interviewSession.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: lastWeek },
        status: 'completed',
        deletedAt: null,
      },
      include: {
        questions: { include: { evaluation: true } },
      },
    });

    const scores = sessions
      .flatMap(s => s.questions)
      .map(q => q.evaluation?.score ?? 0)
      .filter(s => s > 0);

    const stats = {
      sessions: sessions.length,
      avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    };

    const template = emailTemplates.weeklyReminder(stats);
    await sendEmail({ to: user.email, ...template });
    sent++;
  }

  return NextResponse.json({ sent, timestamp: new Date().toISOString() });
}
