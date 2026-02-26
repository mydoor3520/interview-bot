'use client';

import { useEffect, useState, useCallback } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

interface User {
  id: string;
  email: string;
  name: string | null;
  subscriptionTier: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { sessions: number };
}

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  subscriptionTier: string;
  isActive: boolean;
  isAdmin: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  monthlySessionCount: number;
  stripeCustomerId: string | null;
  profile: {
    name: string;
    currentRole: string;
    currentCompany: string | null;
    totalYearsExp: number;
  } | null;
  subscription: {
    status: string;
    tier: string;
    billingCycle: string;
    currentPeriodEnd: string;
  } | null;
  _count: {
    sessions: number;
    usageLogs: number;
    betaFeedback: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ConfirmAction =
  | { type: 'changeTier'; userId: string; userName: string; currentTier: string; newTier: string }
  | { type: 'suspend'; userId: string; userName: string }
  | { type: 'unsuspend'; userId: string; userName: string }
  | { type: 'delete'; userId: string; userName: string }
  | { type: 'forcePasswordReset'; userId: string; userName: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Action states
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: '20' });
    if (search) params.set('search', search);
    if (tierFilter) params.set('tier', tierFilter);

    try {
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [search, tierFilter]);

  useEffect(() => { fetchUsers(); }, [tierFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss action messages
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenuId]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const fetchUserDetail = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setUserDetail(null);
      return;
    }
    setExpandedUserId(userId);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (res.ok) {
        setUserDetail(data.user);
      } else {
        setActionMessage({ type: 'error', text: data.error || '상세 정보를 불러올 수 없습니다.' });
        setExpandedUserId(null);
      }
    } catch {
      setActionMessage({ type: 'error', text: '상세 정보를 불러오는 중 오류가 발생했습니다.' });
      setExpandedUserId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);

    try {
      const { type, userId } = confirmAction;
      let res: Response;

      if (type === 'delete') {
        res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      } else {
        const bodyMap: Record<string, Record<string, string>> = {
          changeTier: { action: 'changeTier', tier: (confirmAction as Extract<ConfirmAction, { type: 'changeTier' }>).newTier },
          suspend: { action: 'suspend', reason: '관리자에 의한 정지' },
          unsuspend: { action: 'unsuspend' },
          forcePasswordReset: { action: 'forcePasswordReset' },
        };
        res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyMap[type]),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: data.message });
        // Refresh the user list and close detail
        await fetchUsers(pagination.page);
        if (expandedUserId === userId) {
          setExpandedUserId(null);
          setUserDetail(null);
        }
      } else {
        setActionMessage({ type: 'error', text: data.error || '작업에 실패했습니다.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: '작업 처리 중 오류가 발생했습니다.' });
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const getConfirmConfig = (action: ConfirmAction) => {
    switch (action.type) {
      case 'changeTier':
        return {
          title: '등급 변경',
          message: `"${action.userName}" 사용자의 등급을 ${action.currentTier}에서 ${action.newTier}(으)로 변경하시겠습니까?`,
          confirmText: '변경',
          variant: 'warning' as const,
        };
      case 'suspend':
        return {
          title: '사용자 정지',
          message: `"${action.userName}" 사용자를 정지하시겠습니까?\n정지된 사용자는 서비스를 이용할 수 없습니다.`,
          confirmText: '정지',
          variant: 'danger' as const,
        };
      case 'unsuspend':
        return {
          title: '정지 해제',
          message: `"${action.userName}" 사용자의 정지를 해제하시겠습니까?`,
          confirmText: '해제',
          variant: 'info' as const,
        };
      case 'delete':
        return {
          title: '사용자 삭제',
          message: `"${action.userName}" 사용자를 삭제하시겠습니까?\n이 작업은 소프트 삭제로 처리되며, 관리자 DB 인증이 수행됩니다.`,
          confirmText: '삭제',
          variant: 'danger' as const,
        };
      case 'forcePasswordReset':
        return {
          title: '비밀번호 초기화',
          message: `"${action.userName}" 사용자에게 비밀번호 초기화 이메일을 발송하시겠습니까?`,
          confirmText: '초기화',
          variant: 'warning' as const,
        };
    }
  };

  const confirmConfig = confirmAction ? getConfirmConfig(confirmAction) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">사용자 관리</h1>

      {/* Action feedback toast */}
      {actionMessage && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            actionMessage.type === 'success'
              ? 'bg-green-500/15 text-green-400 border border-green-500/30'
              : 'bg-red-500/15 text-red-400 border border-red-500/30'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      <div className="flex gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이메일 또는 이름 검색..."
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            검색
          </button>
        </form>
        <select
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 등급</option>
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-100" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full">
              <thead className="bg-zinc-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">이메일</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">이름</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">등급</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">세션 수</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">상태</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">가입일</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">마지막 로그인</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isExpanded={expandedUserId === user.id}
                    userDetail={expandedUserId === user.id ? userDetail : null}
                    detailLoading={detailLoading && expandedUserId === user.id}
                    openMenuId={openMenuId}
                    onToggleDetail={() => fetchUserDetail(user.id)}
                    onOpenMenu={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === user.id ? null : user.id);
                    }}
                    onAction={(action) => {
                      setOpenMenuId(null);
                      setConfirmAction(action);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => fetchUsers(p)}
                  className={`px-3 py-1 rounded text-sm ${
                    p === pagination.page
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <div className="text-sm text-zinc-500 text-center">
            총 {pagination.total}명의 사용자
          </div>
        </>
      )}

      {/* Confirm dialog */}
      {confirmConfig && (
        <ConfirmDialog
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={executeAction}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          variant={confirmConfig.variant}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// UserRow sub-component
// ────────────────────────────────────────────────────────

interface UserRowProps {
  user: User;
  isExpanded: boolean;
  userDetail: UserDetail | null;
  detailLoading: boolean;
  openMenuId: string | null;
  onToggleDetail: () => void;
  onOpenMenu: (e: React.MouseEvent) => void;
  onAction: (action: ConfirmAction) => void;
}

function UserRow({
  user,
  isExpanded,
  userDetail,
  detailLoading,
  openMenuId,
  onToggleDetail,
  onOpenMenu,
  onAction,
}: UserRowProps) {
  const userName = user.name || user.email;
  const isMenuOpen = openMenuId === user.id;
  const newTier = user.subscriptionTier === 'PRO' ? 'FREE' : 'PRO';

  return (
    <>
      <tr
        className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
        onClick={onToggleDetail}
      >
        <td className="px-4 py-3 text-sm text-zinc-300">{user.email}</td>
        <td className="px-4 py-3 text-sm text-zinc-300">{user.name || '-'}</td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
            user.subscriptionTier === 'PRO'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-zinc-700 text-zinc-400'
          }`}>
            {user.subscriptionTier}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-zinc-300 text-center">{user._count.sessions}</td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
            user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {user.isActive ? '활성' : '비활성'}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-zinc-500">
          {new Date(user.createdAt).toLocaleDateString('ko-KR')}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-500">
          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('ko-KR') : '-'}
        </td>
        <td className="px-4 py-3 text-center">
          <div className="relative inline-block">
            <button
              onClick={onOpenMenu}
              className="px-2 py-1 text-xs text-zinc-400 bg-zinc-800 rounded-lg hover:bg-zinc-700 hover:text-zinc-200 transition-colors border border-zinc-700"
            >
              관리
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-40 py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction({
                      type: 'changeTier',
                      userId: user.id,
                      userName,
                      currentTier: user.subscriptionTier,
                      newTier,
                    });
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  등급 변경 ({newTier})
                </button>
                {user.isActive ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction({ type: 'suspend', userId: user.id, userName });
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-zinc-700 transition-colors"
                  >
                    계정 정지
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction({ type: 'unsuspend', userId: user.id, userName });
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-green-400 hover:bg-zinc-700 transition-colors"
                  >
                    정지 해제
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction({ type: 'forcePasswordReset', userId: user.id, userName });
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  비밀번호 초기화
                </button>
                <div className="border-t border-zinc-700 my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction({ type: 'delete', userId: user.id, userName });
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 transition-colors"
                >
                  사용자 삭제
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="px-4 py-0">
            <div className="py-4 border-t border-zinc-800/50">
              {detailLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-400" />
                </div>
              ) : userDetail ? (
                <UserDetailPanel detail={userDetail} />
              ) : null}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────
// UserDetailPanel sub-component
// ────────────────────────────────────────────────────────

function UserDetailPanel({ detail }: { detail: UserDetail }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Account info */}
      <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
        <h4 className="text-sm font-semibold text-zinc-300 mb-3">계정 정보</h4>
        <dl className="space-y-2 text-sm">
          <DetailItem label="이메일" value={detail.email} />
          <DetailItem label="이름" value={detail.name || '-'} />
          <DetailItem
            label="이메일 인증"
            value={detail.emailVerified ? '인증됨' : '미인증'}
            valueClass={detail.emailVerified ? 'text-green-400' : 'text-yellow-400'}
          />
          <DetailItem label="관리자" value={detail.isAdmin ? '예' : '아니오'} />
          <DetailItem
            label="가입일"
            value={new Date(detail.createdAt).toLocaleString('ko-KR')}
          />
          <DetailItem
            label="마지막 로그인"
            value={detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString('ko-KR') : '-'}
          />
        </dl>
      </div>

      {/* Usage stats */}
      <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
        <h4 className="text-sm font-semibold text-zinc-300 mb-3">사용 통계</h4>
        <dl className="space-y-2 text-sm">
          <DetailItem label="이번 달 세션" value={String(detail.monthlySessionCount)} />
          <DetailItem label="총 세션 수" value={String(detail._count.sessions)} />
          <DetailItem label="AI 사용 로그" value={String(detail._count.usageLogs)} />
          <DetailItem label="피드백" value={String(detail._count.betaFeedback)} />
          <DetailItem
            label="Stripe ID"
            value={detail.stripeCustomerId || '-'}
          />
        </dl>
      </div>

      {/* Profile & Subscription */}
      <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
        <h4 className="text-sm font-semibold text-zinc-300 mb-3">프로필 / 구독</h4>
        <dl className="space-y-2 text-sm">
          {detail.profile ? (
            <>
              <DetailItem label="직무" value={detail.profile.currentRole} />
              <DetailItem label="회사" value={detail.profile.currentCompany || '-'} />
              <DetailItem label="경력" value={`${detail.profile.totalYearsExp}년`} />
            </>
          ) : (
            <div className="text-zinc-500 text-xs">프로필 미설정</div>
          )}
          <div className="border-t border-zinc-800 pt-2 mt-2" />
          {detail.subscription ? (
            <>
              <DetailItem label="구독 상태" value={detail.subscription.status} />
              <DetailItem label="결제 주기" value={detail.subscription.billingCycle} />
              <DetailItem
                label="만료일"
                value={new Date(detail.subscription.currentPeriodEnd).toLocaleDateString('ko-KR')}
              />
            </>
          ) : (
            <div className="text-zinc-500 text-xs">구독 정보 없음</div>
          )}
        </dl>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={valueClass || 'text-zinc-300'}>{value}</dd>
    </div>
  );
}
