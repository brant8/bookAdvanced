import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { authApi } from './authApi';

export function AuthGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const status = useQuery({ queryFn: authApi.status, queryKey: ['auth-status'], retry: false });
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const submit = useMutation({
    mutationFn: () =>
      status.data?.registrationRequired
        ? authApi.register(form)
        : authApi.login({ email: form.email, password: form.password }),
    onSuccess: (value) => queryClient.setQueryData(['auth-status'], value),
  });

  if (status.isLoading) return <main className="auth-screen">正在连接 StoryVerse...</main>;
  if (status.data?.authenticated) return children;

  return (
    <main className="auth-screen">
      <form
        className="panel auth-card"
        onSubmit={(event) => {
          event.preventDefault();
          submit.mutate();
        }}
      >
        <p className="eyebrow">STORYVERSE OWNER</p>
        <h1>{status.data?.registrationRequired ? '创建本地管理员' : '登录创作空间'}</h1>
        <p>
          {status.data?.registrationRequired
            ? '首次启用账号模式时，将现有本地项目绑定到此管理员。'
            : '登录后继续访问本机或 NAS 中的创作项目。'}
        </p>
        {status.data?.registrationRequired ? (
          <label>
            显示名称
            <input
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
            />
          </label>
        ) : null}
        <label>
          邮箱
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>
        <label>
          密码（至少 10 位）
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
        {submit.error ? <p className="notice notice--error">{submit.error.message}</p> : null}
        <button className="button" disabled={submit.isPending} type="submit">
          {status.data?.registrationRequired ? '创建管理员' : '登录'}
        </button>
      </form>
    </main>
  );
}
