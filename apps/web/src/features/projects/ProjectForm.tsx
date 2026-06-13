import { useState, type FormEvent } from 'react';

import type { CreateProjectInput, Project } from '@storyverse/contracts';

interface ProjectFormProps {
  initialProject?: Project;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (input: CreateProjectInput) => Promise<void>;
}

export function ProjectForm({ initialProject, isPending, onCancel, onSubmit }: ProjectFormProps) {
  const [name, setName] = useState(initialProject?.name ?? '');
  const [description, setDescription] = useState(initialProject?.description ?? '');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ description, name });
  }

  return (
    <form className="project-form" onSubmit={(event) => void handleSubmit(event)}>
      <label>
        项目名称
        <input
          autoFocus
          maxLength={80}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        简介
        <textarea
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <div className="form-actions">
        <button className="button button--quiet" type="button" onClick={onCancel}>
          取消
        </button>
        <button className="button" disabled={isPending} type="submit">
          {isPending ? '保存中…' : initialProject ? '保存修改' : '创建项目'}
        </button>
      </div>
    </form>
  );
}
