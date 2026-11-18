import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <p className="brand-kicker">Employee support</p>
          <h1 className="brand">Support Desk</h1>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          {user.role === 'employee' ? <NavLink to="/tickets/new">New ticket</NavLink> : null}
        </nav>
        <div className="sidebar-user">
          <strong>{user.name}</strong>
          <span>{user.role === 'support' ? 'Support staff' : 'Employee'}</span>
          <button type="button" className="button button-quiet" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
