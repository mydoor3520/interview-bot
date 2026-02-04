'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface Topic {
  id: string;
  name: string;
  category: string;
  description: string | null;
  isPreset: boolean;
  isActive: boolean;
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [newTopic, setNewTopic] = useState({ name: '', category: '', description: '' });

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/topics');
      if (res.ok) {
        const data = await res.json();
        setTopics(data.topics);
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreate = async () => {
    if (!newTopic.name || !newTopic.category) {
      alert('이름과 카테고리를 입력해주세요.');
      return;
    }

    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTopic),
      });

      if (res.ok) {
        setNewTopic({ name: '', category: '', description: '' });
        setIsAdding(false);
        fetchTopics();
      } else {
        alert('주제 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to create topic:', error);
      alert('주제 생성에 실패했습니다.');
    }
  };

  const handleToggleActive = async (topic: Topic) => {
    try {
      const res = await fetch('/api/topics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: topic.id, isActive: !topic.isActive }),
      });

      if (res.ok) {
        fetchTopics();
      }
    } catch (error) {
      console.error('Failed to toggle topic:', error);
    }
  };

  const handleDelete = async (topic: Topic) => {
    if (topic.isPreset) {
      alert('프리셋 주제는 삭제할 수 없습니다.');
      return;
    }

    if (!confirm(`"${topic.name}" 주제를 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/topics?id=${topic.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTopics();
      } else {
        alert('주제 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete topic:', error);
      alert('주제 삭제에 실패했습니다.');
    }
  };

  // Filter topics
  const filteredTopics = topics.filter((topic) => {
    const matchesSearch = topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         topic.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || topic.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedTopics = filteredTopics.reduce((acc, topic) => {
    if (!acc[topic.category]) acc[topic.category] = [];
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<string, Topic[]>);

  const categories = Array.from(new Set(topics.map((t) => t.category))).sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">주제 관리</h1>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            {isAdding ? '취소' : '+ 커스텀 주제 추가'}
          </button>
        </div>

        {/* Add Topic Form */}
        {isAdding && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">새 주제 추가</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">주제명*</label>
                <input
                  type="text"
                  value={newTopic.name}
                  onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                  placeholder="예: React Hooks"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">카테고리*</label>
                <input
                  type="text"
                  value={newTopic.category}
                  onChange={(e) => setNewTopic({ ...newTopic, category: e.target.value })}
                  placeholder="예: Frontend"
                  list="categories"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white"
                />
                <datalist id="categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-400 mb-2">설명</label>
              <textarea
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                placeholder="주제에 대한 설명을 입력하세요"
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
              >
                추가
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewTopic({ name: '', category: '', description: '' });
                }}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">검색</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="주제 이름 또는 설명으로 검색"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">카테고리 필터</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
              >
                <option value="">전체 카테고리</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Topics Grid */}
        {Object.keys(groupedTopics).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400">검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTopics).map(([category, categoryTopics]) => (
              <div key={category}>
                <h2 className="text-xl font-semibold text-white mb-4">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className={cn(
                        'bg-zinc-900 border rounded-lg p-4 transition-colors',
                        topic.isActive ? 'border-zinc-800' : 'border-zinc-800 opacity-60'
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-white font-medium flex-1">{topic.name}</h3>
                        <div className="flex items-center gap-2">
                          {topic.isPreset && (
                            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded">
                              프리셋
                            </span>
                          )}
                          <button
                            onClick={() => handleToggleActive(topic)}
                            className={cn(
                              'w-10 h-6 rounded-full transition-colors relative',
                              topic.isActive ? 'bg-green-500' : 'bg-zinc-700'
                            )}
                          >
                            <div
                              className={cn(
                                'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform',
                                topic.isActive ? 'translate-x-5' : 'translate-x-1'
                              )}
                            />
                          </button>
                        </div>
                      </div>

                      {topic.description && (
                        <p className="text-zinc-400 text-sm mb-3">{topic.description}</p>
                      )}

                      {!topic.isPreset && (
                        <button
                          onClick={() => handleDelete(topic)}
                          className="w-full px-3 py-2 bg-red-500/10 text-red-400 rounded text-sm hover:bg-red-500/20 transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
