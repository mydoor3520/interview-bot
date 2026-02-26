import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // MRR: sum of active subscription amounts
  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    select: { amount: true, billingCycle: true },
  });
  const mrr = activeSubscriptions.reduce((sum, sub) => {
    return sum + (sub.billingCycle === 'YEARLY' ? Math.round(sub.amount / 12) : sub.amount);
  }, 0);

  // Total users by tier
  const usersByTier = await prisma.user.groupBy({
    by: ['subscriptionTier'],
    where: { deletedAt: null, isActive: true },
    _count: true,
  });

  // New subscriptions this month
  const newSubsThisMonth = await prisma.subscription.count({
    where: { createdAt: { gte: startOfMonth } },
  });

  // Canceled this month
  const canceledThisMonth = await prisma.subscription.count({
    where: { canceledAt: { gte: startOfMonth }, status: 'CANCELED' },
  });

  // Revenue this month
  const revenueThisMonth = await prisma.payment.aggregate({
    where: { createdAt: { gte: startOfMonth }, status: 'SUCCEEDED' },
    _sum: { amount: true },
    _count: true,
  });

  // Revenue last month
  const revenueLastMonth = await prisma.payment.aggregate({
    where: {
      createdAt: { gte: startOfLastMonth, lt: startOfMonth },
      status: 'SUCCEEDED',
    },
    _sum: { amount: true },
  });

  // Total active subscriptions
  const totalActive = await prisma.subscription.count({ where: { status: 'ACTIVE' } });

  // Churn rate
  const churnRate = totalActive > 0 ? (canceledThisMonth / (totalActive + canceledThisMonth)) * 100 : 0;

  // Conversion rate (PRO / total users)
  const tierGroups = usersByTier as { subscriptionTier: string; _count: number }[];
  const totalUsers = tierGroups.reduce((sum: number, g) => sum + g._count, 0);
  const proUsers = tierGroups.find(g => g.subscriptionTier === 'PRO')?._count || 0;
  const conversionRate = totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0;

  return NextResponse.json({
    mrr,
    revenueThisMonth: revenueThisMonth._sum.amount || 0,
    revenueLastMonth: revenueLastMonth._sum.amount || 0,
    paymentsThisMonth: revenueThisMonth._count,
    newSubscriptions: newSubsThisMonth,
    canceledSubscriptions: canceledThisMonth,
    totalActiveSubscriptions: totalActive,
    churnRate: Math.round(churnRate * 10) / 10,
    conversionRate: Math.round(conversionRate * 10) / 10,
    usersByTier: Object.fromEntries(tierGroups.map(g => [g.subscriptionTier, g._count])),
    totalUsers,
  });
}
