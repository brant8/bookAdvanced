import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';

import type { CreateProjectInput, Project } from '@storyverse/contracts';

import { createProject, deleteProject, listProjects, updateProject } from './projectApi';
import { ProjectForm } from './ProjectForm';

export function ProjectListPage() {
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<'closed' | 'create'>('closed');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const projectsQuery = useQuery({ queryFn: listProjects, queryKey: ['projects'] });
  const refreshProjects = () => queryClient.invalidateQueries({ queryKey: ['projects'] });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      setFormMode('closed');
      await refreshProjects();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateProjectInput }) =>
      updateProject(id, input),
    onSuccess: async () => {
      setEditingProject(null);
      await refreshProjects();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: refreshProjects,
  });

  const projects = projectsQuery.data ?? [];
  const error = projectsQuery.error ?? createMutation.error ?? updateMutation.error;

  return (
    <main className="project-home">
      <header className="project-home__header">
        <div>
          <p className="eyebrow">STORYVERSE / 本地创作空间</p>
          <h1>你的故事，从结构开始。</h1>
          <p>在一个地方管理世界设定、角色、故事线与正文。</p>
        </div>
        <button className="button" onClick={() => setFormMode('create')}>
          新建项目
        </button>
      </header>

      {error ? <p className="notice notice--error">{error.message}</p> : null}

      {formMode === 'create' ? (
        <section className="panel">
          <h2>创建新项目</h2>
          <ProjectForm
            isPending={createMutation.isPending}
            onCancel={() => setFormMode('closed')}
            onSubmit={async (input) => {
              await createMutation.mutateAsync(input);
            }}
          />
        </section>
      ) : null}

      {editingProject ? (
        <section className="panel">
          <h2>编辑项目</h2>
          <ProjectForm
            initialProject={editingProject}
            isPending={updateMutation.isPending}
            onCancel={() => setEditingProject(null)}
            onSubmit={async (input) => {
              await updateMutation.mutateAsync({ id: editingProject.id, input });
            }}
          />
        </section>
      ) : null}

      <section aria-busy={projectsQuery.isLoading}>
        <div className="section-heading">
          <h2>项目</h2>
          <span>{projects.length} 个</span>
        </div>
        {projectsQuery.isLoading ? <p className="notice">正在读取项目…</p> : null}
        {!projectsQuery.isLoading && projects.length === 0 ? (
          <div className="empty-state">
            <strong>还没有故事项目</strong>
            <p>先创建一个项目，接着建立创作圣经和第一条故事线。</p>
          </div>
        ) : null}
        <div className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <Link className="project-card__link" to={`/projects/${project.id}`}>
                <span className="project-card__mark">{project.name.slice(0, 1)}</span>
                <div>
                  <h3>{project.name}</h3>
                  <p>{project.description || '尚未添加项目简介'}</p>
                </div>
              </Link>
              <div className="project-card__actions">
                <button onClick={() => setEditingProject(project)}>编辑</button>
                <button
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`确定删除“${project.name}”吗？此操作不可撤销。`)) {
                      deleteMutation.mutate(project.id);
                    }
                  }}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
