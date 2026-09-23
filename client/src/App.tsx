import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { InvestigationsPage } from './pages/InvestigationsPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { IntelligencePage } from './pages/IntelligencePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          }
        />
        <Route
          path="/investigations"
          element={
            <AppLayout>
              <InvestigationsPage />
            </AppLayout>
          }
        />
        <Route
          path="/investigations/:id"
          element={
            <AppLayout>
              <WorkspacePage />
            </AppLayout>
          }
        />
        <Route
          path="/intelligence"
          element={
            <AppLayout>
              <IntelligencePage />
            </AppLayout>
          }
        />
        <Route
          path="/intelligence/:id"
          element={
            <AppLayout>
              <IntelligencePage />
            </AppLayout>
          }
        />
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
