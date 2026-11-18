import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { PriorityMark, StatusBadge } from '../components/Badges';
import { formatWhen } from '../format';

const EMPTY_FILTERS = { search: '', category: '', priority: '', status: '' };
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export function DashboardPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    setLoading(true);
    api(`/api/tickets${query ? `?${query}` : ''}`)
      .then((data) => {
        setTickets(data.tickets);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  const counts = STATUSES.map((status) => ({
    status,
    count: tickets.filter((ticket) => ticket.status === status).length,
  }));

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{user.role === 'support' ? 'Support staff' : 'Employee'}</p>
          <h2>{user.role === 'support' ? 'All support tickets' : 'My tickets'}</h2>
        </div>
        {user.role === 'employee' ? (
          <Link className="button" to="/tickets/new">
            Create ticket
          </Link>
        ) : null}
      </header>
      <p className="note">
        The five starter tickets use the fictional date 18 November 2026 and are marked sample data. Tickets you
        create use the current application time.
      </p>
      <section className="cards">
        {counts.map((item) => (
          <button
            key={item.status}
            type="button"
            className={`summary-card ${filters.status === item.status ? 'summary-card-active' : ''}`}
            onClick={() => updateFilter('status', filters.status === item.status ? '' : item.status)}
          >
            <span>{item.status}</span>
            <strong>{item.count}</strong>
          </button>
        ))}
      </section>
      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          Search
          <input
            value={filters.search}
            placeholder="Title or description"
            onChange={(event) => updateFilter('search', event.target.value)}
          />
        </label>
        <label>
          Category
          <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
            <option value="">All categories</option>
            {['Hardware', 'Software', 'Network', 'Access', 'Other'].map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}>
            <option value="">All priorities</option>
            {['Low', 'Medium', 'High'].map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p>Loading tickets…</p> : null}
      {!loading && tickets.length === 0 ? <p className="empty">No tickets match these filters.</p> : null}
      {!loading && tickets.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created by</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td data-label="Title">
                    <Link to={`/tickets/${ticket.id}`}>{ticket.title}</Link>
                  </td>
                  <td data-label="Category">{ticket.category}</td>
                  <td data-label="Priority">
                    <PriorityMark priority={ticket.priority} />
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td data-label="Created by">{ticket.createdBy.name}</td>
                  <td data-label="Updated">{formatWhen(ticket.updatedAt, ticket.timestampOrigin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
