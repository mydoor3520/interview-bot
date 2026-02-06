'use client';

import { useEffect, useState } from 'react';

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async (page = 1) => {
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
  };

  useEffect(() => { fetchUsers(); }, [tierFilter]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchUsers(1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">사용자 관리</h1>

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
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
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
                  </tr>
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
    </div>
  );
}
