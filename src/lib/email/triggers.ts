import { sendEmail } from './index';
import { emailTemplates } from './templates';
import { prisma } from '@/lib/db/prisma';

export async function triggerWelcomeEmail(userId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return;

    const template = emailTemplates.welcome(user.name || '사용자');
    await sendEmail({ to: user.email, ...template });
  } catch (err) {
    console.error('[EMAIL] Failed to send welcome email:', err);
  }
}

export async function triggerPaymentSuccessEmail(userId: string, tier: string, amount: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email || !user.emailNotifications) return;

    const template = emailTemplates.paymentSuccess(tier, amount);
    await sendEmail({ to: user.email, ...template });
  } catch (err) {
    console.error('[EMAIL] Failed to send payment success email:', err);
  }
}

export async function triggerPaymentFailedEmail(userId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email || !user.emailNotifications) return;

    const template = emailTemplates.paymentFailed();
    await sendEmail({ to: user.email, ...template });
  } catch (err) {
    console.error('[EMAIL] Failed to send payment failed email:', err);
  }
}

export async function triggerRenewalReminderEmail(userId: string, nextDate: string, amount: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email || !user.emailNotifications) return;

    const template = emailTemplates.renewalReminder(nextDate, amount);
    await sendEmail({ to: user.email, ...template });
  } catch (err) {
    console.error('[EMAIL] Failed to send renewal reminder email:', err);
  }
}

export async function triggerUsageWarningEmail(userId: string, used: number, limit: number) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email || !user.emailNotifications) return;

    const template = emailTemplates.usageWarning80(used, limit);
    await sendEmail({ to: user.email, ...template });
  } catch (err) {
    console.error('[EMAIL] Failed to send usage warning email:', err);
  }
}

export async function triggerUsageLimitEmail(userId: string, limit: number) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email || !user.emailNotifications) return;

    const template = emailTemplates.usageLimitReached(limit);
    await sendEmail({ to: user.email, ...template });
  } catch (err) {
    console.error('[EMAIL] Failed to send usage limit email:', err);
  }
}
