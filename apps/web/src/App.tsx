import { Navigate, Route, Routes } from 'react-router';

import { BiblePage } from './features/creative/BiblePage';
import { CharactersPage } from './features/creative/CharactersPage';
import { StoryPage } from './features/creative/StoryPage';
import { WorldPage } from './features/creative/WorldPage';
import { ProjectDashboardPage } from './features/projects/ProjectDashboardPage';
import { ProjectListPage } from './features/projects/ProjectListPage';
import { NotesPage } from './features/workspace/NotesPage';
import { SettingsPage } from './features/workspace/SettingsPage';
import { TimelinePage } from './features/workspace/TimelinePage';
import { WritePage } from './features/workspace/WritePage';
import { ProjectWorkspaceLayout } from './layouts/ProjectWorkspaceLayout';

export function App() {
  return (
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
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
