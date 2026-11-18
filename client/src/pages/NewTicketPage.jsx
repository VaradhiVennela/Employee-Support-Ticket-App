import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export function NewTicketPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Hardware',
    priority: 'Medium',
  });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const data = await api('/api/tickets', { method: 'POST', body: form });
      navigate(`/tickets/${data.ticket.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="page narrow">
      <header className="page-header">
        <div>
          <p className="eyebrow">Employee</p>
          <h2>Create a ticket</h2>
        </div>
      </header>
      <form className="stack-form" onSubmit={onSubmit}>
        {error ? <p className="form-error">{error}</p> : null}
        <label>
          Title
          <input value={form.title} maxLength={100} onChange={(event) => update('title', event.target.value)} />
        </label>
        <label>
          Description
          <textarea rows={5} value={form.description} onChange={(event) => update('description', event.target.value)} />
        </label>
        <div className="split">
          <label>
            Category
            <select value={form.category} onChange={(event) => update('category', event.target.value)}>
              {['Hardware', 'Software', 'Network', 'Access', 'Other'].map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select value={form.priority} onChange={(event) => update('priority', event.target.value)}>
              {['Low', 'Medium', 'High'].map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </label>
        </div>
        <button className="button" type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Submit ticket'}
        </button>
      </form>
    </div>
  );
}
