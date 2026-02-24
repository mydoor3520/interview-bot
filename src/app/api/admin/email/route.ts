import { NextRequest, NextResponse } from 'next/server';
import { requireAdminStrict } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import { logAuditEvent } from '@/lib/audit-log';
import { sendEmail } from '@/lib/email';

// In-memory rate limiter
let lastSendTime = 0;

export async function POST(request: NextRequest) {
  const auth = await requireAdminStrict(request);
  if (!auth.authenticated) return auth.response;

  try {
    // Rate limit check
    const rateLimitMinutes = parseInt(process.env.ADMIN_EMAIL_RATE_LIMIT_MINUTES || '10');
    const now = Date.now();
    if (now - lastSendTime < rateLimitMinutes * 60 * 1000) {
      const retryAfter = Math.ceil((lastSendTime + rateLimitMinutes * 60 * 1000 - now) / 1000);
      return NextResponse.json(
        { error: `이메일 발송은 ${rateLimitMinutes}분에 1회만 가능합니다.` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await request.json();
    const { target, specificEmails, subject, bodyText, confirmed } = body;

    if (!subject || !bodyText) {
      return NextResponse.json({ error: '제목과 내용은 필수입니다.' }, { status: 400 });
    }

    if (!['all', 'FREE', 'PRO', 'specific'].includes(target)) {
      return NextResponse.json({ error: '유효하지 않은 대상입니다.' }, { status: 400 });
    }

    // Get recipient emails
    let emails: string[] = [];

    if (target === 'specific') {
      if (!specificEmails || !Array.isArray(specificEmails) || specificEmails.length === 0) {
        return NextResponse.json({ error: '수신자 이메일을 지정해주세요.' }, { status: 400 });
      }
      if (specificEmails.length > 1000) {
        return NextResponse.json({ error: '최대 1000명까지 발송 가능합니다.' }, { status: 400 });
      }
      emails = specificEmails;
    } else {
      // Tier-based sends require confirmation
      if (!confirmed) {
        // Return count for confirmation
        const where: Record<string, unknown> = { emailNotifications: true };
        if (target === 'FREE') where.subscriptionTier = 'FREE';
        if (target === 'PRO') where.subscriptionTier = 'PRO';

        const count = await prisma.user.count({ where });
        return NextResponse.json({
          requiresConfirmation: true,
          recipientCount: count,
          message: `${count}명에게 발송됩니다. 발송 확인 버튼을 눌러주세요.`
        });
      }

      const where: Record<string, unknown> = { emailNotifications: true };
      if (target === 'FREE') where.subscriptionTier = 'FREE';
      if (target === 'PRO') where.subscriptionTier = 'PRO';

      const users = await prisma.user.findMany({
        where,
        select: { email: true },
      });
      emails = users.map(u => u.email);
    }

    if (emails.length === 0) {
      return NextResponse.json({ error: '발송 대상이 없습니다.' }, { status: 400 });
    }

    // Send emails (simple implementation - send one by one)
    // In production, this should be batched via Resend batch API
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // HTML escape to prevent injection
    const escapeHtml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

    // Wrap body text in simple HTML template
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">${escapeHtml(subject)}</h2>
        <div style="color: #555; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(bodyText)}</div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">Interview Bot에서 보낸 이메일입니다.</p>
      </div>
    `;

    for (const email of emails) {
      try {
        await sendEmail({
          to: email,
          subject,
          html: htmlBody,
        });
        sent++;
      } catch (err) {
        failed++;
        errors.push(`${email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    lastSendTime = Date.now();

    await logAuditEvent({
      userId: auth.user.userId,
      action: 'admin.email.sent',
      resource: 'email',
      details: { target, subject, recipientCount: sent + failed, sent, failed },
    });

    return NextResponse.json({ success: true, sent, failed, errors: errors.slice(0, 10) });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: '이메일 발송 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// GET - Recent send history from audit logs
export async function GET(request: NextRequest) {
  const { requireAdmin } = await import('@/lib/auth/require-admin');
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { prismaBase } = await import('@/lib/db/prisma');
    const logs = await prismaBase.auditLog.findMany({
      where: { action: 'admin.email.sent' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Email history error:', error);
    return NextResponse.json({ error: '발송 기록을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
