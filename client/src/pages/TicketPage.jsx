import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { PriorityMark, StatusBadge } from '../components/Badges';
import { formatWhen } from '../format';

export function TicketPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function load() {
    return api(`/api/tickets/${id}`)
      .then((data) => {
        setTicket(data.ticket);
        setComments(data.comments);
        setDraft({
          title: data.ticket.title,
          description: data.ticket.description,
          category: data.ticket.category,
          priority: data.ticket.priority,
        });
        setError('');
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function saveContent(event) {
    event.preventDefault();
    setNotice('');
    try {
      const data = await api(`/api/tickets/${id}`, { method: 'PATCH', body: draft });
      setTicket(data.ticket);
      setNotice('Ticket details saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveStatus(event) {
    event.preventDefault();
    const status = event.target.status.value;
    setNotice('');
    try {
      const data = await api(`/api/tickets/${id}/status`, { method: 'PATCH', body: { status } });
      setTicket(data.ticket);
      setNotice('Status updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function addComment(event) {
    event.preventDefault();
    setNotice('');
    try {
      const data = await api(`/api/tickets/${id}/comments`, { method: 'POST', body: { body: comment } });
      setComments((current) => [...current, data.comment]);
      setComment('');
      setNotice('Comment added.');
      const refreshed = await api(`/api/tickets/${id}`);
      setTicket(refreshed.ticket);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !ticket) {
    return (
      <div className="page">
        <p className="form-error">{error}</p>
        <Link to="/">Back to dashboard</Link>
      </div>
    );
  }

  if (!ticket || !draft) {
    return <p className="page">Loading ticket…</p>;
  }

  const closed = ticket.status === 'Closed';

  return (
    <div className="page">
      <Link className="back-link" to="/">
        Back to dashboard
      </Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">Ticket {ticket.id}</p>
          <h2>{ticket.title}</h2>
        </div>
        <div className="ticket-marks">
          <StatusBadge status={ticket.status} />
          <PriorityMark priority={ticket.priority} />
        </div>
      </header>
      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-notice">{notice}</p> : null}
      <dl className="meta">
        <div>
          <dt>Created by</dt>
          <dd>{ticket.createdBy.name}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatWhen(ticket.createdAt, ticket.timestampOrigin)}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{formatWhen(ticket.updatedAt, ticket.timestampOrigin)}</dd>
        </div>
      </dl>

      {closed ? (
        <p className="note">This ticket is closed. Title, description, category, and priority cannot be edited.</p>
      ) : (
        <form className="stack-form" onSubmit={saveContent}>
          <h3>Ticket details</h3>
          <label>
            Title
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <label>
            Description
            <textarea
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </label>
          <div className="split">
            <label>
              Category
              <select
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              >
                {['Hardware', 'Software', 'Network', 'Access', 'Other'].map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={draft.priority}
                onChange={(event) => setDraft({ ...draft, priority: event.target.value })}
              >
                {['Low', 'Medium', 'High'].map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </label>
          </div>
          <button className="button" type="submit">
            Save changes
          </button>
        </form>
      )}

      {user.role === 'support' ? (
        <form className="status-form" onSubmit={saveStatus}>
          <label>
            Status
            <select name="status" defaultValue={ticket.status} key={ticket.status}>
              {['Open', 'In Progress', 'Resolved', 'Closed'].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <button className="button" type="submit">
            Update status
          </button>
        </form>
      ) : null}

      <section className="comments">
        <h3>Comments</h3>
        {comments.length === 0 ? <p className="empty">No comments yet.</p> : null}
        <ul>
          {comments.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.author.name}</strong>
                <span>{formatWhen(item.createdAt, 'system')}</span>
              </div>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
        <form onSubmit={addComment}>
          <label>
            Add a comment
            <textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
          </label>
          <button className="button" type="submit">
            Add comment
          </button>
        </form>
      </section>
    </div>
  );
}
