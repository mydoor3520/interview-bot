'use client';

import { useState, useEffect } from 'react';
import { PortfolioProjectForm } from './PortfolioProjectForm';

interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  role: string;
  teamSize: number | null;
  startDate: string;
  endDate: string | null;
  techStack: string[];
  achievements: string[];
  troubleshooting: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  category: string;
}

interface PortfolioProjectListProps {
  onProjectCountChange?: (count: number) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  personal: '개인 프로젝트',
  work: '업무',
  opensource: '오픈소스',
  hackathon: '해커톤',
};

const CATEGORY_BADGE: Record<string, string> = {
  personal: 'bg-blue-900/50 text-blue-400',
  work: 'bg-emerald-900/50 text-emerald-400',
  opensource: 'bg-purple-900/50 text-purple-400',
  hackathon: 'bg-orange-900/50 text-orange-400',
};

function formatMonth(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  return `${year}.${month}`;
}

export function PortfolioProjectList({ onProjectCountChange }: PortfolioProjectListProps) {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | undefined>(undefined);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    try {
      const res = await fetch('/api/portfolio/projects');
      if (res.ok) {
        const data = await res.json();
        const list = data.projects || [];
        setProjects(list);
        onProjectCountChange?.(list.length);
      }
    } catch (err) {
      console.error('Failed to fetch portfolio projects:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/portfolio/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = projects.filter((p) => p.id !== id);
        setProjects(updated);
        setConfirmDeleteId(null);
        onProjectCountChange?.(updated.length);
      }
    } catch (err) {
      console.error('Failed to delete portfolio project:', err);
    } finally {
      setDeletingId(null);
    }
  }

  function handleEdit(project: PortfolioProject) {
    setEditingProject(project);
    setShowForm(true);
  }

  function handleAdd() {
    setEditingProject(undefined);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingProject(undefined);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Add button */}
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            프로젝트 추가
          </button>
        </div>

        {/* Empty state */}
        {projects.length === 0 && (
          <p className="text-sm text-zinc-500 py-2">
            아직 등록된 프로젝트가 없습니다. 프로젝트를 추가해보세요.
          </p>
        )}

        {/* Project cards */}
        {projects.map((project) => (
          <div key={project.id} className="relative">
            {confirmDeleteId === project.id ? (
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-950/30 border border-red-900/50">
                <span className="text-sm text-red-300">삭제하시겠습니까?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(project.id)}
                    disabled={deletingId === project.id}
                    className="px-3 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingId === project.id ? '삭제 중...' : '삭제'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1 rounded text-xs font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          CATEGORY_BADGE[project.category] || 'bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        {CATEGORY_LABELS[project.category] || project.category}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-100 truncate">{project.title}</h3>
                    </div>

                    {/* Role / Team size / Date */}
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2 flex-wrap">
                      <span>{project.role}</span>
                      {project.teamSize != null && <span>팀 {project.teamSize}명</span>}
                      <span>
                        {formatMonth(project.startDate)} –{' '}
                        {project.endDate ? formatMonth(project.endDate) : '진행 중'}
                      </span>
                    </div>

                    {/* Tech stack */}
                    {project.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {project.techStack.slice(0, 8).map((tech) => (
                          <span
                            key={tech}
                            className="px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-300 text-xs"
                          >
                            {tech}
                          </span>
                        ))}
                        {project.techStack.length > 8 && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-500 text-xs">
                            +{project.techStack.length - 8}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Achievements count */}
                    {project.achievements.length > 0 && (
                      <p className="text-xs text-zinc-500">
                        성과 {project.achievements.length}건
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(project)}
                      className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                      title="수정"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(project.id)}
                      className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <PortfolioProjectForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSaved={fetchProjects}
        existingProject={editingProject}
      />
    </>
  );
}
