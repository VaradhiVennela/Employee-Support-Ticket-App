import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NewTicketPage } from './pages/NewTicketPage';
import { TicketPage } from './pages/TicketPage';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="center-message">Loading…</p>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user && !loading ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route
        path="/tickets/new"
        element={
          <Protected>
            <NewTicketPage />
          </Protected>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <Protected>
            <TicketPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
