import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { AuthGate } from './features/auth/AuthGate';
import { ProjectWorkspaceLayout } from './layouts/ProjectWorkspaceLayout';

const ProjectListPage = lazy(() =>
  import('./features/projects/ProjectListPage').then((module) => ({
    default: module.ProjectListPage,
  })),
);
const ProjectDashboardPage = lazy(() =>
  import('./features/projects/ProjectDashboardPage').then((module) => ({
    default: module.ProjectDashboardPage,
  })),
);
const BiblePage = lazy(() =>
  import('./features/creative/BiblePage').then((module) => ({ default: module.BiblePage })),
);
const WorldPage = lazy(() =>
  import('./features/creative/WorldPage').then((module) => ({ default: module.WorldPage })),
);
const CharactersPage = lazy(() =>
  import('./features/creative/CharactersPage').then((module) => ({
    default: module.CharactersPage,
  })),
);
const StoryPage = lazy(() =>
  import('./features/creative/StoryPage').then((module) => ({ default: module.StoryPage })),
);
const TimelinePage = lazy(() =>
  import('./features/workspace/TimelinePage').then((module) => ({
    default: module.TimelinePage,
  })),
);
const WritePage = lazy(() =>
  import('./features/workspace/WritePage').then((module) => ({ default: module.WritePage })),
);
const NotesPage = lazy(() =>
  import('./features/workspace/NotesPage').then((module) => ({ default: module.NotesPage })),
);
const AssetsPage = lazy(() =>
  import('./features/visual/AssetsPage').then((module) => ({ default: module.AssetsPage })),
);
const StoryboardPage = lazy(() =>
  import('./features/visual/StoryboardPage').then((module) => ({
    default: module.StoryboardPage,
  })),
);
const SettingsPage = lazy(() =>
  import('./features/workspace/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
);

export function App() {
  return (
    <AuthGate>
      <Suspense fallback={<p className="notice route-loading">正在载入工作台...</p>}>
        <Routes>
          <Route index element={<ProjectListPage />} />
          <Route path="projects/:projectId" element={<ProjectWorkspaceLayout />}>
            <Route index element={<ProjectDashboardPage />} />
            <Route path="bible" element={<BiblePage />} />
            <Route path="world" element={<WorldPage />} />
            <Route path="characters" element={<CharactersPage />} />
            <Route path="story" element={<StoryPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="write" element={<WritePage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="storyboard" element={<StoryboardPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </Suspense>
    </AuthGate>
  );
}
