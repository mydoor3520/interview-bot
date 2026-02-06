import { prisma } from '@/lib/db/prisma';

interface AuditEvent {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        details: event.details ?? undefined,
        ip: event.ip,
      },
    });
  } catch (err) {
    console.error('[AUDIT] Failed to log event:', { action: event.action, error: err });
  }
}
