import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';
import CalendarPage from './pages/CalendarPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import SearchPage from './pages/SearchPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="board/:id" element={<BoardPage />} />
        <Route path="board/:id/calendar" element={<CalendarPage />} />
        <Route path="board/:id/stats" element={<StatsPage />} />
        <Route path="board/:id/settings" element={<SettingsPage />} />
        <Route path="search" element={<SearchPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
